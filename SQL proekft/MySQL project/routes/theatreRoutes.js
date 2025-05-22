// routes/theatreRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const Theatre = require('../models/Theatre');
const Screen = require('../models/Screen');
const Seat = require('../models/Seat');
const { isAdmin } = require('./middleware');

// GET /api/theatres (Public - Get all theatres, optionally with their screens)
router.get('/', async (req, res, next) => {
    try {
        const theatres = await Theatre.getAll();
        // Optionally, fetch screens for each theatre if needed for a summary view
        // This can be N+1 query problem, consider optimizing if performance is an issue
        for (const theatre of theatres) {
            theatre.screens = await Screen.getByTheatreId(theatre.theater_id);
        }
        res.status(200).json(theatres);
    } catch (error) {
        next(error);
    }
});

// GET /api/theatres/:id (Public - Get a single theatre by ID, including its screens)
router.get('/:id', async (req, res, next) => {
    try {
        const theater_id = parseInt(req.params.id);
        if (isNaN(theater_id)) {
            return res.status(400).json({ message: 'Invalid theatre ID format.' });
        }
        const theatre = await Theatre.getById(theater_id);
        if (!theatre) {
            return res.status(404).json({ message: 'Theatre not found.' });
        }
        theatre.screens = await Screen.getByTheatreId(theater_id) || [];
        res.status(200).json(theatre);
    } catch (error) {
        next(error);
    }
});

// POST /api/theatres (Admin only - Add a new theatre with screens and seats)
router.post('/', isAdmin, async (req, res, next) => {
    const { name, location, total_seats, screens } = req.body;

    if (!name || !location || total_seats == null) {
        return res.status(400).json({ message: 'Theatre name, location, and total_seats are required.' });
    }
    if (!Array.isArray(screens) || screens.length === 0) {
        return res.status(400).json({ message: 'At least one screen must be provided.' });
    }
     if (isNaN(parseInt(total_seats)) || parseInt(total_seats) <=0) {
         return res.status(400).json({ message: 'Theatre total_seats must be a positive number.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const theatreData = { name, location, total_seats: parseInt(total_seats) };
        const newTheatre = await Theatre.create(theatreData, connection);

        const createdScreensInfo = [];
        const uniqueScreenNumbers = new Set();

        for (const screenItem of screens) {
            const screenNum = parseInt(screenItem.screen_number);
            const screenSeats = parseInt(screenItem.total_seats);

            if (isNaN(screenNum) || screenNum < 1 || isNaN(screenSeats) || screenSeats < 1) {
                await connection.rollback();
                return res.status(400).json({ message: `Invalid data for screen: Number '${screenItem.screen_number}', Seats '${screenItem.total_seats}'. Both must be positive integers.` });
            }
            if (uniqueScreenNumbers.has(screenNum)) {
                await connection.rollback();
                return res.status(400).json({ message: `Duplicate screen number: ${screenNum}. Screen numbers must be unique for this theatre.` });
            }
            uniqueScreenNumbers.add(screenNum);

            const screenData = {
                theater_id: newTheatre.theater_id,
                screen_number: screenNum,
                total_seats: screenSeats
            };
            const newScreen = await Screen.create(screenData, connection);
            createdScreensInfo.push(newScreen);

            const seatsToCreate = [];
            for (let i = 1; i <= newScreen.total_seats; i++) {
                const rowChar = String.fromCharCode(65 + Math.floor((i - 1) / 10));
                const seatNumInRow = ((i - 1) % 10) + 1;
                seatsToCreate.push({
                    seat_number: `${rowChar}${seatNumInRow}`,
                    seat_type: i <= newScreen.total_seats * 0.2 ? 'Premium' : 'Regular'
                });
            }
            if (seatsToCreate.length > 0) {
                await Seat.createMany(seatsToCreate, newScreen.screen_id, connection);
            }
        }

        await connection.commit();
        newTheatre.screens = createdScreensInfo;
        res.status(201).json({ message: 'Theatre, screens, and seats added successfully!', theatre: newTheatre });

    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// PUT /api/theatres/:id (Admin only - Update theatre details AND its screens)
router.put('/:id', isAdmin, async (req, res, next) => {
    const theater_id = parseInt(req.params.id);
    if (isNaN(theater_id)) {
        return res.status(400).json({ message: 'Invalid theatre ID format.' });
    }

    const { name, location, total_seats, screens } = req.body; // `screens` is array of { screen_id (optional), screen_number, total_seats }

    if (!name && !location && total_seats == null && !screens) {
        return res.status(400).json({ message: 'At least one field (name, location, total_seats, or screens) is required for update.' });
    }
    if (total_seats != null && (isNaN(parseInt(total_seats)) || parseInt(total_seats) <=0)) {
         return res.status(400).json({ message: 'Theatre total_seats must be a positive number if provided.' });
    }


    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const existingTheatre = await Theatre.getById(theater_id); // Use non-transactional read or pass connection
        if (!existingTheatre) {
            await connection.rollback();
            return res.status(404).json({ message: 'Theatre not found for update.' });
        }

        // Update theatre's own details
        const theatreUpdateData = {
            name: name || existingTheatre.name,
            location: location || existingTheatre.location,
            total_seats: total_seats != null ? parseInt(total_seats) : existingTheatre.total_seats
        };
        await Theatre.update(theater_id, theatreUpdateData); // This should use the main pool, not transaction for this specific update if model isn't adapted

        // Screen management: More complex.
        // Strategy: Identify new screens, screens to update, screens to delete.
        if (Array.isArray(screens)) {
            const existingDbScreens = await Screen.getByTheatreId(theater_id); // Use non-transactional read
            const uniqueScreenNumbers = new Set();

            const screenIdsInRequest = new Set(screens.map(s => s.screen_id).filter(id => id != null));

            // Delete screens not in the request
            for (const dbScreen of existingDbScreens) {
                if (!screenIdsInRequest.has(dbScreen.screen_id)) {
                    await Screen.delete(dbScreen.screen_id, connection); // CASCADE will delete seats & showtimes
                }
            }
            
            const updatedScreensInfo = [];
            for (const screenItem of screens) {
                const screenNum = parseInt(screenItem.screen_number);
                const screenSeats = parseInt(screenItem.total_seats);

                if (isNaN(screenNum) || screenNum < 1 || isNaN(screenSeats) || screenSeats < 1) {
                     await connection.rollback();
                     return res.status(400).json({ message: `Invalid data for screen: Number '${screenItem.screen_number}', Seats '${screenItem.total_seats}'.` });
                }
                if (uniqueScreenNumbers.has(screenNum) && !(screenItem.screen_id && existingDbScreens.find(s => s.screen_id === screenItem.screen_id && s.screen_number === screenNum))) {
                    // Allow same number if it's the same screen being updated
                    await connection.rollback();
                    return res.status(400).json({ message: `Duplicate screen number: ${screenNum}. Not allowed for new/different screens.` });
                }
                uniqueScreenNumbers.add(screenNum);

                const screenData = {
                    theater_id: theater_id,
                    screen_number: screenNum,
                    total_seats: screenSeats
                };

                if (screenItem.screen_id) { // Existing screen: Update
                    const existingScreenToUpdate = existingDbScreens.find(s => s.screen_id === screenItem.screen_id);
                    if (!existingScreenToUpdate) {
                        await connection.rollback();
                        return res.status(404).json({ message: `Screen with ID ${screenItem.screen_id} not found for this theatre.`});
                    }
                    // If total_seats changed, existing seats for this screen are deleted by ON DELETE CASCADE on Seats table
                    // when the screen is updated (if you were to delete and recreate screen).
                    // A better approach is to only update screen_number. Seat changes are complex.
                    // For simplicity here, if total_seats changes, we'll assume seats need manual adjustment or a separate process.
                    // The Screen.update model method itself doesn't handle seat recreation.
                    if (existingScreenToUpdate.total_seats !== screenData.total_seats) {
                        console.warn(`Screen ${screenItem.screen_id} total seats changed. Existing seats are NOT automatically adjusted by this update. Manual seat adjustment or a dedicated screen seat update mechanism is needed.`);
                        // To fully manage this, you'd delete old seats and create new ones for this screen.
                    }
                    await Screen.update(screenItem.screen_id, screenData, connection);
                    updatedScreensInfo.push({...screenData, screen_id: screenItem.screen_id});

                } else { // New screen: Create
                    const newScreen = await Screen.create(screenData, connection);
                    updatedScreensInfo.push(newScreen);
                    // Auto-generate seats for this new screen
                    const seatsToCreate = [];
                    for (let i = 1; i <= newScreen.total_seats; i++) {
                        const rowChar = String.fromCharCode(65 + Math.floor((i - 1) / 10));
                        const seatNumInRow = ((i - 1) % 10) + 1;
                        seatsToCreate.push({
                            seat_number: `${rowChar}${seatNumInRow}`,
                            seat_type: i <= newScreen.total_seats * 0.2 ? 'Premium' : 'Regular'
                        });
                    }
                    if (seatsToCreate.length > 0) {
                        await Seat.createMany(seatsToCreate, newScreen.screen_id, connection);
                    }
                }
            }
             existingTheatre.screens = updatedScreensInfo; // Reflect updated/added screens
        }


        await connection.commit();
        // Fetch the updated theatre again to include potentially modified screen list for response
        const finalUpdatedTheatre = await Theatre.getById(theater_id); // Non-transactional read
        finalUpdatedTheatre.screens = await Screen.getByTheatreId(theater_id);


        res.status(200).json({ message: 'Theatre and its screens updated successfully.', theatre: finalUpdatedTheatre });

    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});


// DELETE /api/theatres/:id (Admin only - Delete a theatre)
router.delete('/:id', isAdmin, async (req, res, next) => {
    try {
        const theater_id = parseInt(req.params.id);
        if (isNaN(theater_id)) {
            return res.status(400).json({ message: 'Invalid theatre ID format.' });
        }
        const theatreExists = await Theatre.getById(theater_id);
        if (!theatreExists) {
            return res.status(404).json({ message: 'Theatre not found.' });
        }
        const success = await Theatre.delete(theater_id); // DB's ON DELETE CASCADE handles related
        if (!success) {
            return res.status(404).json({ message: 'Theatre could not be deleted or was already deleted.' });
        }
        res.status(200).json({ message: 'Theatre and all associated data deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
