use moviebookingsystem1;
DROP TABLE IF EXISTS Booking_Discounts;
DROP TABLE IF EXISTS Discounts;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS Bookings;
DROP TABLE IF EXISTS Showtimes;
DROP TABLE IF EXISTS Seats;
DROP TABLE IF EXISTS Screens;
DROP TABLE IF EXISTS Reviews;
DROP TABLE IF EXISTS Movies;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Theatre;
-- -----------------new start------------------------- --
-- Users Table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('Admin', 'Customer') NOT NULL
);

-- Movies Table
CREATE TABLE Movies (
    movie_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    duration INT NOT NULL,
    release_date DATE NOT NULL
);

-- Theatre Table (yes, singular and final)
CREATE TABLE Theatre (
    theater_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    total_seats INT NOT NULL
);

-- Screens Table
CREATE TABLE Screens (
    screen_id INT AUTO_INCREMENT PRIMARY KEY,
    theater_id INT NOT NULL,
    screen_number INT NOT NULL,
    total_seats INT NOT NULL,
    FOREIGN KEY (theater_id) REFERENCES Theatre(theater_id) ON DELETE CASCADE
);

-- Seats Table
CREATE TABLE Seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    screen_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_type ENUM('Regular', 'Premium', 'VIP') NOT NULL,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE
);

-- Showtimes Table
CREATE TABLE Showtimes (
    showtime_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    theater_id INT NOT NULL,
    screen_id INT NOT NULL,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    available_seats INT NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (theater_id) REFERENCES Theatre(theater_id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE
);

-- Bookings Table
CREATE TABLE Bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    showtime_id INT NOT NULL,
    seat_id INT NOT NULL,
    seats_booked INT NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Confirmed', 'Cancelled') NOT NULL DEFAULT 'Confirmed',
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (showtime_id) REFERENCES Showtimes(showtime_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE Payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('Credit Card', 'Debit Card', 'UPI', 'Cash') NOT NULL,
    payment_status ENUM('Successful', 'Failed', 'Pending') NOT NULL DEFAULT 'Pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE
);

-- Reviews Table
CREATE TABLE Reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

-- Discounts Table
CREATE TABLE Discounts (
    discount_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL
);

-- Booking_Discounts Table (Many-to-Many)
CREATE TABLE Booking_Discounts (
    booking_id INT NOT NULL,
    discount_id INT NOT NULL,
    PRIMARY KEY (booking_id, discount_id),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (discount_id) REFERENCES Discounts(discount_id) ON DELETE CASCADE
);

INSERT INTO Theatre (name, location, total_seats)
VALUES ('Debug Palace', 'Stack Overflow Blvd', 200);

INSERT INTO Screens (theater_id, screen_number, total_seats)
VALUES (1, 1, 50);

INSERT INTO Movies (title, genre, duration, release_date)
VALUES ('SQL Redemption', 'Action', 120, '2025-05-17');

INSERT INTO Showtimes (movie_id, theater_id, screen_id, show_date, show_time, available_seats)
VALUES (1, 1, 1, CURDATE() + INTERVAL 1 DAY, '19:00:00', 50);

select * from movies;
INSERT INTO Bookings (user_id, showtime_id, seat_id, seats_booked, status)
VALUES 
(3, 7, 15, 1, 'confirmed'),
(3, 7, 16, 1, 'confirmed');

-- Add to your movie-simulator.sql or run on your DB
ALTER TABLE Movies
ADD COLUMN poster_image_url VARCHAR(255) DEFAULT NULL,
ADD COLUMN backdrop_image_url VARCHAR(255) DEFAULT NULL,
ADD COLUMN synopsis TEXT DEFAULT NULL;

UPDATE users
SET user_type = 'admin'
WHERE username = 'Aditya P';

ALTER TABLE Movies 
MODIFY poster_image_url TEXT,
MODIFY backdrop_image_url TEXT;

CREATE TABLE Movie_Cast (
    cast_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    role_type ENUM('Actor', 'Director') NOT NULL,
    character_name VARCHAR(255) NULL, -- Only applicable if role_type is 'Actor'
    image_url TEXT NULL, -- URL for their profile picture
    display_order INT DEFAULT 0, -- To control order, e.g., main actors first
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

select * from movie_cast;


