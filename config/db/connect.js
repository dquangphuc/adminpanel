const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost', 
    user: 'root',      
    password: '',    
    database: 'db_banhang' 
});

// Kết nối tới cơ sở dữ liệu
db.connect((err) => {
    if (err) {
        console.error('Không thể kết nối tới MySQL:', err.message);
        return;
    }
    console.log('Kết nối tới MySQL thành công.');
});

module.exports = db;
