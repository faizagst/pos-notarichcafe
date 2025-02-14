import mysql from 'mysql2/promise';

const db = mysql.createPool({
    host: 'localhost',
    user: 'root', // Default MySQL username
    password: '', // Default MySQL password
    database: 'notarichcafe_pos', // Your database name

});

export default db;
