CREATE DATABASE IF NOT EXISTS plant_disease_results;
USE plant_disease_results;
CREATE TABLE predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_name VARCHAR(255) NOT NULL,
    prediction VARCHAR(50) NOT NULL,
    confidence DOUBLE NOT NULL,
    prob_healthy DOUBLE NOT NULL,
    prob_diseased DOUBLE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);