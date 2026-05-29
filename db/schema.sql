CREATE DATABASE IF NOT EXISTS adams_house_reservations CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE adams_house_reservations;

CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_full_name VARCHAR(160) NOT NULL,
  guest_phone VARCHAR(40) NOT NULL,
  guest_email VARCHAR(160) NOT NULL,
  adults INT UNSIGNED NOT NULL DEFAULT 1,
  children INT UNSIGNED NOT NULL DEFAULT 0,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT UNSIGNED NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  deposit_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('Pending','Confirmed','Paid','Cancelled') NOT NULL DEFAULT 'Pending',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_reservation_dates (check_in, check_out),
  INDEX idx_reservation_status (status),
  CONSTRAINT chk_dates CHECK (check_out > check_in),
  CONSTRAINT chk_amounts CHECK (total_amount >= 0 AND deposit_paid >= 0 AND remaining_amount >= 0),
  CONSTRAINT chk_guests CHECK (adults >= 1 AND children >= 0)
);
