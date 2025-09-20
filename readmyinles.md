PAYSTREAM - Project Documentation
https://media/image1.jpg

Team Information
Team Name: Venadotech

Date: 19-09-2025

Team Members:

Alberto Macias Roman

Omar Lopez Esparza

Juan Pablo Martínez Martínez

Giovanny Manuel Velasco

Project Description
PAYSTREAM is an innovative payment application designed to facilitate secure payments for online events. Its primary goal is to reduce the reliance on physical cards and promote digital payments in non-banking sectors. By utilizing secure transaction tokenization, it significantly reduces digital fraud and ensures your personal banking information remains protected.

Table of Contents
Key Features

Technology Stack

Project Structure

Installation & Configuration

Usage Guide

API Reference

Troubleshooting

Contributing

License

Key Features
🔒 Fraud Reduction
Secure transaction tokenization

Reduces digital fraud by up to 60%

🛡️ Data Protection
Protection for data both in transit and at rest

Personal banking information remains protected

💳 Digital Wallet Integration
Architecture designed for easy integration with:

Google Pay

Apple Pay

PayPal

🌐 Secure Online Payments
Safe and reliable payments for online events

No need to expose personal bank card details

Technology Stack
Frontend
HTML5

CSS3

Vanilla JavaScript

Backend
Node.js

Express.js

Open Payments API

Key Dependencies
@interledger/open-payments

dotenv

cors

Development Tools
Visual Studio Code

GitHub

npm

Project Structure
text
hackaton/
├── public/
│   ├── index.html
│   ├── styles/
│   └── scripts/
├── .env
├── package.json
├── server.js
└── README.md
Key Files
.env: Environment configuration file

index.html: Main user interface for the event marketplace

package.json: Project dependencies and scripts

server.js: Express server handling Open Payments API logic

Installation & Configuration
Prerequisites
Node.js (v14 or higher)

npm (v6 or higher)

Open Payments account

Installation Steps
Clone the repository

bash
git clone https://github.com/ywacht/hackaton.git
cd hackaton
Install dependencies

bash
npm install
Configure environment variables
Create a .env file in the root directory:

env
PORT=3001
APP_URL=http://localhost:3001
WALLET_ADDRESS_URL=https://ilp.interledger-test.dev/b-e
KEY_ID=your-key-id
PRIVATE_KEY=your-private-key
Start the application

bash
npm start
Access the application
Open your browser at: http://localhost:3001

Usage Guide
Payment Flow
Select event and tickets

Enter payment information

Confirm transaction

Receive confirmation and tickets

User Roles
Buyer: Can browse events and make payments

Organizer: Can create events and manage sales

API Reference
Main Endpoints
Create Payment Request
http
POST /api/payment-request
Content-Type: application/json

{
  "amount": "100.00",
  "currency": "USD",
  "eventId": "event_123"
}
Check Payment Status
http
GET /api/payment-status/:paymentId
Troubleshooting
Common Issues
Port Already in Use
bash
Error: listen EADDRINUSE: address already in use :::3001
Solution: Change the port in the .env file or terminate the process using the port.

Missing Environment Variables
bash
Error: Missing required environment variables
Solution: Verify that the .env file exists and contains all required variables.

Open Payments API Connection Error
bash
Error: Connection timeout
Solution: Check internet connectivity and API credentials.

Contributing
Fork the project

Create a feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request

License
This project is licensed under the MIT License. See the LICENSE file for details.

Contact
Venadotech Team - email@venadotech.com

Project Link: https://github.com/ywacht/hackaton

