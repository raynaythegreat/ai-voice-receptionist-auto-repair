import express from 'express';
import { dbOperations } from '../db/database.js';
import { sendSMS } from '../services/twilio.js';

const router = express.Router();

// Get all reservations
router.get('/', (req, res) => {
  try {
    const { date, status } = req.query;
    
    let query = 'SELECT * FROM reservations WHERE 1=1';
    const params = [];
    
    if (date) {
      query += ' AND reservation_date = ?';
      params.push(date);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY reservation_date, reservation_time';
    
    const reservations = dbOperations.all(query, params);
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single reservation
router.get('/:id', (req, res) => {
  try {
    const reservation = dbOperations.get(
      'SELECT * FROM reservations WHERE id = ?',
      [req.params.id]
    );
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create reservation
router.post('/', async (req, res) => {
  try {
    const {
      customer_name,
      phone_number,
      party_size,
      reservation_date,
      reservation_time,
      notes
    } = req.body;

    // Validate required fields
    if (!customer_name || !phone_number || !party_size || !reservation_date || !reservation_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = dbOperations.run(`
      INSERT INTO reservations (
        customer_name, phone_number, party_size,
        reservation_date, reservation_time, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
    `, [customer_name, phone_number, party_size, reservation_date, reservation_time, notes || null]);

    const reservation = dbOperations.get(
      'SELECT * FROM reservations WHERE id = ?',
      [result.lastInsertRowid]
    );

    // Send confirmation SMS if phone number is valid
    if (phone_number && phone_number.length >= 10) {
      try {
        const formattedPhone = phone_number.startsWith('+') 
          ? phone_number 
          : `+1${phone_number.replace(/\D/g, '')}`;
        
        const message = `Hi ${customer_name}! Your reservation at Shaw's Steakhouse is confirmed for ${party_size} guests on ${reservation_date} at ${reservation_time}. See you soon! Reply CANCEL to cancel.`;
        
        await sendSMS(formattedPhone, message);
        
        dbOperations.run(
          'UPDATE reservations SET confirmation_sent = 1 WHERE id = ?',
          [reservation.id]
        );
        reservation.confirmation_sent = 1;
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
        // Don't fail the reservation if SMS fails
      }
    }

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update reservation
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'customer_name', 'phone_number', 'party_size',
      'reservation_date', 'reservation_time', 'notes', 'status'
    ];
    
    const setClause = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    dbOperations.run(
      `UPDATE reservations SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );
    
    const updated = dbOperations.get(
      'SELECT * FROM reservations WHERE id = ?',
      [id]
    );
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete reservation
router.delete('/:id', (req, res) => {
  try {
    const reservation = dbOperations.get(
      'SELECT * FROM reservations WHERE id = ?',
      [req.params.id]
    );
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    dbOperations.run('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    
    res.json({ success: true, deleted: reservation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
