// utils/mailer.js
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs'); // Needed if saving PDF temporarily to disk before attaching
const path = require('path');

// Configure the email transporter using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

function generateTicketHTML(bookingDetails) {
    const seatList = bookingDetails.all_booked_seats_for_transaction
        .map(seat => `${seat.seat_number} (${seat.seat_type || 'Regular'})`)
        .join(', ');

    let discountInfoHTML = '';
    if (bookingDetails.payment_details.original_amount && bookingDetails.payment_details.discount_applied > 0) {
        discountInfoHTML = `
            <p style="font-size: 14px; margin: 5px 0;">Original Amount: ₹${parseFloat(bookingDetails.payment_details.original_amount).toFixed(2)}</p>
            <p style="font-size: 14px; margin: 5px 0; color: #28a745;">Discount Applied (${bookingDetails.payment_details.discount_code || 'PROMO'}): - ₹${parseFloat(bookingDetails.payment_details.discount_applied).toFixed(2)}</p>
        `;
    }
    
    // Basic QR Code Data URL for embedding (using an external service for simplicity in email)
    // In a real scenario, you might generate this QR on the fly or link to an image.
    // For email, embedding direct QR code generation is complex, so an image link or a simpler text representation is often used.
    // Or generate QR, save as image, then attach. Here we'll use a placeholder text for simplicity in email.
    const qrData = `CineVerse E-Ticket - ID: ${bookingDetails.booking_id}, Seats: ${seatList}`;


    return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #007bff;">CineVerse Ticket Confirmation</h1>
            </div>
            <h2 style="color: #0056b3; border-bottom: 1px solid #eee; padding-bottom: 10px;">Thank You for Your Booking, ${bookingDetails.username || 'Guest'}!</h2>
            <p>Your booking for <strong>${bookingDetails.movie_title}</strong> is confirmed.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #333;">Booking Details:</h3>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Booking ID:</strong> ${bookingDetails.booking_id}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Movie:</strong> ${bookingDetails.movie_title}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Theatre:</strong> ${bookingDetails.theatre_name}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Screen:</strong> ${bookingDetails.screen_number}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Date:</strong> ${new Date(bookingDetails.show_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Time:</strong> ${new Date(`1970-01-01T${bookingDetails.show_time}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Seats:</strong> ${seatList}</p>
                ${discountInfoHTML}
                <p style="font-size: 14px; margin: 5px 0;"><strong>Total Paid:</strong> ₹${parseFloat(bookingDetails.payment_details.amount).toFixed(2)}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Status:</strong> ${bookingDetails.status}</p>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 10px; border: 1px dashed #ccc;">
                <h4 style="margin-top:0;">QR Code / Entry Pass</h4>
                <p style="font-size:12px;">Please show this email or the QR code on the payment confirmation page at the cinema entrance.</p>
                <p style="font-size:12px; word-break: break-all;">${qrData}</p> 
            </div>

            <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">
                This is an automated email. Please do not reply directly. For support, visit our website or contact customer service.
                <br>&copy; ${new Date().getFullYear()} CineVerse. All rights reserved.
            </p>
        </div>
    `;
}

function generateTicketPDF(bookingDetails, callback) {
    const doc = new PDFDocument({ margin: 50, size: 'A5' }); // A5 is a bit smaller, good for tickets
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- PDF Content ---
    doc.fontSize(20).fillColor('#0056b3').text('CineVerse E-Ticket', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(14).fillColor('#333').text(`Thank you, ${bookingDetails.username || 'Guest'}!`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).fillColor('#0056b3').text(bookingDetails.movie_title, { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#555');
    doc.text(`Booking ID: ${bookingDetails.booking_id}`);
    doc.text(`Theatre: ${bookingDetails.theatre_name} - Screen ${bookingDetails.screen_number}`);
    doc.text(`Date: ${new Date(bookingDetails.show_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
    doc.text(`Time: ${new Date(`1970-01-01T${bookingDetails.show_time}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
    
    const seatList = bookingDetails.all_booked_seats_for_transaction
        .map(seat => `${seat.seat_number} (${seat.seat_type || 'Regular'})`)
        .join(', ');
    doc.text(`Seats: ${seatList}`);
    doc.moveDown(0.5);

    if (bookingDetails.payment_details.original_amount && bookingDetails.payment_details.discount_applied > 0) {
        doc.fontSize(10).fillColor('#555').text(`Original Amount: Rs. ${parseFloat(bookingDetails.payment_details.original_amount).toFixed(2)}`);
        doc.fillColor('#28a745').text(`Discount (${bookingDetails.payment_details.discount_code || 'PROMO'}): - Rs. ${parseFloat(bookingDetails.payment_details.discount_applied).toFixed(2)}`);
    }
    doc.fontSize(12).fillColor('#333').font('Helvetica-Bold').text(`Total Paid: Rs. ${parseFloat(bookingDetails.payment_details.amount).toFixed(2)}`);
    doc.font('Helvetica'); // Reset font
    doc.moveDown();

    doc.fontSize(10).fillColor('#555').text(`Status: ${bookingDetails.status}`);
    doc.moveDown(1.5);

    // Add QR code to PDF (difficult without saving image first or using a library that embeds QR directly)
    // For simplicity here, we'll just put the text data.
    // In a real app, you'd generate a QR image, then: doc.image('path/to/qr.png', { fit: [100, 100], align: 'center' });
    const qrData = `CineVerse E-Ticket ID: ${bookingDetails.booking_id}`;
    doc.fontSize(10).text('Scan at Entrance:', { align: 'center' });
    doc.fontSize(8).text(qrData, { align: 'center' });
    doc.moveDown();


    doc.fontSize(8).fillColor('#777').text('Present this ticket (digital or print) at the cinema entrance. Enjoy the movie!', { align: 'center', baseline: 'bottom' });
    
    doc.end();
}


async function sendBookingConfirmationEmail(recipientEmail, bookingDetails) {
    if (!recipientEmail) {
        console.error('No recipient email provided for booking confirmation.');
        return;
    }

    generateTicketPDF(bookingDetails, async (pdfBuffer) => {
        const mailOptions = {
            from: `"CineVerse Booking" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `Your CineVerse Ticket for ${bookingDetails.movie_title} is Confirmed! (ID: ${bookingDetails.booking_id})`,
            html: generateTicketHTML(bookingDetails),
            attachments: [
                {
                    filename: `CineVerse_Ticket_${bookingDetails.booking_id}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Booking confirmation email sent successfully to ${recipientEmail} for booking ID ${bookingDetails.booking_id}.`);
        } catch (emailError) {
            console.error(`Failed to send booking confirmation email to ${recipientEmail}:`, emailError);
            // Decide how to handle this: maybe retry, log for manual sending, or just log the error.
        }
    });
}

module.exports = { sendBookingConfirmationEmail };
