require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const flash = require('express-flash');
const app = express();
const db = require('./config/db/connect');
// Middleware
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));
app.use(flash());

// Middleware để truyền flash messages sang views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.user = req.session.user || null;
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');

// Trang chủ
app.get('/', (req, res) => {
    res.render('login');
});

// Xử lý đăng nhập
app.post('/auth', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    
    if (username && password) {
        db.query('SELECT * FROM admin WHERE username = ? AND password = ?', 
        [username, password], (err, results) => {
            if (err) throw err;
            
            if (results.length > 0) {
                // Đăng nhập thành công
                req.session.loggedin = true;
                req.session.username = username;
                res.redirect('/dashboard');
            } else {
                res.send('Tên đăng nhậprro hoặc mật khẩu không đúng!');
            }
        });
    } else {
        res.send('Vui lòng nhập tên đăng nhập và mật khẩu!');
    }
});

// Dashboard
app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
        res.render('dashboard', {
            username: req.session.username,
            role: req.session.role
        });
    } else {
        res.redirect('/');
    }
});


// Users Management
app.get('/users', (req, res) => {
    try {
        // Truy vấn danh sách user mà không sử dụng cột 'role'
        db.query(`
            SELECT userid, name, phone, email 
            FROM user
        `, (err, results) => {
            if (err) {
                console.error('Lỗi truy vấn database:', err);
                return res.status(500).send('Lỗi truy vấn database');
            }

            // Log kết quả để kiểm tra
            console.log('Danh sách user:', results);

            // Render view
            res.render('users', { 
                users: results,
                title: 'Quản lý Người dùng'
            });
        });
    } catch (error) {
        console.error('Lỗi xử lý route:', error);
        res.status(500).send('Lỗi hệ thống');
    }
});


// Route GET: Hiển thị form thêm khách hàng
app.get('/users/create', (req, res) => {
    try {
        res.render('user-create', { 
            title: 'Thêm Khách Hàng Mới' 
        });
    } catch (error) {
        console.error('Lỗi render view:', error);
        res.status(500).send('Lỗi hệ thống');
    }
});

// Route POST: Xử lý thêm khách hàng
app.post('/user-create', (req, res) => {
    const { name, email, phone, username, password } = req.body;

    // Validate dữ liệu chi tiết hơn
    if (!name || name.trim() === '') {
        return res.status(400).render('user-create', { 
            error: 'Tên không được để trống',
            title: 'Thêm Khách Hàng Mới'
        });
    }

    if (!phone || !/^[0-9]{10,11}$/.test(phone)) {
        return res.status(400).render('user-create', { 
            error: 'Số điện thoại không hợp lệ',
            title: 'Thêm Khách Hàng Mới'
        });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).render('user-create', { 
            error: 'Email không hợp lệ',
            title: 'Thêm Khách Hàng Mới'
        });
    }

    // Kiểm tra xem khách hàng đã tồn tại hay chưa
    const checkQuery = 'SELECT * FROM user WHERE email = ? OR phone = ?';
    db.query(checkQuery, [email, phone], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Lỗi kiểm tra khách hàng:', checkErr);
            return res.status(500).render('user-create', { 
                error: 'Lỗi hệ thống khi kiểm tra khách hàng',
                title: 'Thêm Khách Hàng Mới'
            });
        }

        if (checkResults.length > 0) {
            return res.status(400).render('user-create', { 
                error: 'Email hoặc số điện thoại đã tồn tại',
                title: 'Thêm Khách Hàng Mới'
            });
        }

        // Truy vấn thêm mới
        const query = 'INSERT INTO user (name, phone, email, username, password) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [name, phone, email, username, password], (err, result) => {
            if (err) {
                console.error('Lỗi thêm khách hàng:', err);
                return res.status(500).render('user-create', { 
                    error: 'Lỗi hệ thống khi thêm khách hàng',
                    title: 'Thêm Khách Hàng Mới'
                });
            }
            req.flash('success', 'Thêm khách hàng thành công');
            res.redirect('/users');
        });        
    });
});

// Route GET: Hiển thị form sửa thông tin
app.get('/users/edit/:userid', (req, res) => {
    const userid = req.params.userid;

    // Truy vấn thông tin user cần sửa
    db.query('SELECT * FROM user WHERE userid = ?', [userid], (err, results) => {
        if (err) {
            console.error('Lỗi truy vấn user:', err);
            return res.status(500).send('Lỗi truy vấn');
        }

        if (results.length === 0) {
            return res.status(404).send('Không tìm thấy khách hàng');
        }

        res.render('user-edit', { 
            user: results[0],
            title: 'Chỉnh Sửa Khách Hàng' 
        });
    });
});

// Route POST: Xử lý cập nhật thông tin
app.post('/users/edit/:userid', (req, res) => {
    const userid = req.params.userid;
    const { name, phone, email } = req.body;

    // Validate dữ liệu
    if (!name || !phone || !email) {
        return res.status(400).send('Vui lòng điền đầy đủ thông tin');
    }

    // Truy vấn cập nhật
    const query = 'UPDATE user SET name = ?, phone = ?, email = ? WHERE userid = ?';
    
    db.query(query, [name, phone, email, userid], (err, result) => {
        if (err) {
            console.error('Lỗi cập nhật khách hàng:', err);
            return res.status(500).send('Lỗi cập nhật khách hàng');
        }

        // Chuyển hướng sau khi cập nhật thành công
        res.redirect('/users');
    });
});
// Route GET hoặc POST: Xóa khách hàng
app.get('/users/delete/:userid', (req, res) => {
    const userid = req.params.userid;

    // Truy vấn xóa khách hàng
    const deleteQuery = 'DELETE FROM user WHERE userid = ?';
    
    db.query(deleteQuery, [userid], (err, result) => {
        if (err) {
            console.error('Lỗi xóa khách hàng:', err);
            return res.status(500).send('Lỗi xóa khách hàng');
        }

        // Đặt lại giá trị AUTO_INCREMENT sau khi xóa
        const resetAutoIncrementQuery = 'ALTER TABLE user AUTO_INCREMENT = ?';
        
        // Lấy ID lớn nhất hiện tại để đặt lại AUTO_INCREMENT
        db.query('SELECT MAX(userid) AS max_id FROM user', (maxErr, maxResult) => {
            if (maxErr) {
                console.error('Lỗi lấy ID lớn nhất:', maxErr);
                return res.status(500).send('Lỗi hệ thống');
            }

            const newAutoIncrementValue = maxResult[0].max_id + 1;  // Tăng ID lên 1
            db.query(resetAutoIncrementQuery, [newAutoIncrementValue], (resetErr, resetResult) => {
                if (resetErr) {
                    console.error('Lỗi khi đặt lại AUTO_INCREMENT:', resetErr);
                    return res.status(500).send('Lỗi hệ thống');
                }

                // Chuyển hướng sau khi xóa và đặt lại AUTO_INCREMENT thành công
                res.redirect('/users');
            });
        });
    });
});


// Order
// Route hiển thị danh sách đơn hàng
app.get('/orders', (req, res) => {
    const query = `
        SELECT o.orderid, o.date, o.totalprice, o.userid, u.name
        FROM \`order\` o 
        JOIN user u ON o.userid = u.userid
    `;
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('orders', { orders: results }); // Render ra giao diện orders
    });
});

// Route xem chi tiết đơn hàng
app.get('/order/:orderid', (req, res) => {
    const { orderid } = req.params;
    
    // Lấy dữ liệu từ bảng payment liên quan đến order
    const paymentQuery = `
        SELECT paymentid, method, date, totalprice 
        FROM payment 
        WHERE orderid = ?
    `;
    
    db.query(paymentQuery, [orderid], (err, paymentResults) => {
        if (err) throw err;
        res.render('order_details', { payments: paymentResults }); // Render chi tiết thanh toán
    });
});

// Route xóa đơn hàng
app.post('/delete-order/:orderid', (req, res) => {
    const { orderid } = req.params;

    // Truy vấn để lấy thông tin cartid từ bảng cart
    const cartQuery = `
        SELECT ci.productid, ci.quantity 
        FROM cartitem ci
        JOIN cart c ON ci.cartid = c.cartid
        WHERE c.orderid = ?
    `;

    db.query(cartQuery, [orderid], (err, cartItems) => {
        if (err) throw err;

        // Cập nhật lại số lượng sản phẩm trong bảng product
        cartItems.forEach(item => {
            const updateProductQuery = `
                UPDATE product 
                SET quantity = quantity + ? 
                WHERE productid = ?
            `;
            db.query(updateProductQuery, [item.quantity, item.productid], (err) => {
                if (err) throw err;
            });
        });

        // Xóa bản ghi trong bảng order liên quan đến cartid
        const deleteOrderQuery = 'DELETE FROM `order` WHERE cartid = (SELECT cartid FROM cart WHERE orderid = ?)';
        db.query(deleteOrderQuery, [orderid], (err) => {
            if (err) throw err;

            // Sau khi xóa order, tiếp tục xóa các bảng còn lại
            const deleteCartItemQuery = 'DELETE FROM cartitem WHERE cartid IN (SELECT cartid FROM cart WHERE orderid = ?)';
            db.query(deleteCartItemQuery, [orderid], (err) => {
                if (err) throw err;

                const deletePaymentQuery = 'DELETE FROM payment WHERE orderid = ?';
                db.query(deletePaymentQuery, [orderid], (err) => {
                    if (err) throw err;

                    // Cuối cùng, xóa cart
                    const deleteCartQuery = 'DELETE FROM cart WHERE orderid = ?';
                    db.query(deleteCartQuery, [orderid], (err) => {
                        if (err) throw err;

                        // Redirect hoặc thông báo sau khi xóa thành công
                        res.redirect('/orders');
                    });
                });
            });
        });
    });
});

// Products Management
app.get('/products', (req, res) => {
    if (req.session.loggedin) {
        // Lấy số trang hiện tại từ tham số truy vấn (mặc định là 1 nếu không có tham số)
        const page = parseInt(req.query.page) || 1;
        const limit = 15;
        const offset = (page - 1) * limit;

        // Truy vấn để lấy sản phẩm với limit và offset cho phân trang
        db.query('SELECT * FROM product LIMIT ? OFFSET ?', [limit, offset], (err, results) => {
            if (err) {
                console.error('Lỗi cơ sở dữ liệu:', err);
                return res.status(500).send('Lỗi cơ sở dữ liệu');
            }

            // Truy vấn để đếm tổng số sản phẩm cho phân trang
            db.query('SELECT COUNT(*) AS total FROM product', (err, countResults) => {
                if (err) {
                    console.error('Lỗi cơ sở dữ liệu:', err);
                    return res.status(500).send('Lỗi cơ sở dữ liệu');
                }

                const totalProducts = countResults[0].total;
                const totalPages = Math.ceil(totalProducts / limit);

                res.render('products', {
                    products: results,
                    currentPage: page,
                    totalPages: totalPages
                });
            });
        });
    } else {
        res.redirect('/');
    }
});

// Add Product
app.get('/add-product', (req, res) => {
    if (req.session.loggedin) {
        db.query('SELECT * FROM products', (err, products) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Database error');
            }
            res.render('add_product', { products: products });
        });
    } else {
        res.redirect('/');
    }
});

app.post('/add_product', (req, res) => {
    const { productid, name, price, description, image, quantity, cateid } = req.body;
    const query = 'INSERT INTO product (productid, name, price, description, image, quantity, cateid) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [productid , name, price, description, image, quantity, cateid], (err, result) => {
        if (err) {
            console.error('Error adding product:', err);
            return res.status(500).send('Error adding product');
        }
        res.redirect('/products');
    });
});

// Edit Product
app.get('/edit_product/:id', (req, res) => {
    if (req.session.loggedin) {
        const productId = req.params.id;
        db.query('SELECT * FROM product WHERE productid = ?', [productId], (err, product) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Database error');
            }
            db.query('SELECT * FROM category', (err, categories) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('Database error');
                }
                res.render('edit_product', { 
                    product: product[0],
                    category: categories
                });
            });
        });
    } else {
        res.redirect('/');
    }
});

app.post('/edit_product/:id', (req, res) => {
    const productId = req.params.id;
    const { name, price, description, image, quantity, cateid } = req.body;
    const query = 'UPDATE product SET name = ?, price = ?, description = ?, image = ?, quantity = ?, cateid = ? WHERE productid = ?';
    db.query(query, [name, price, description, image, quantity, cateid, productId], (err, result) => {
        if (err) {
            console.error('Error updating product:', err);
            return res.status(500).send('Error updating product');
        }
        res.redirect('/products');
    });
});

// Delete Product
app.get('/delete-product/:id', (req, res) => {
    if (req.session.loggedin) {
        const productId = req.params.id;
        db.query('DELETE FROM product WHERE productid = ?', [productId], (err, result) => {
            if (err) {
                console.error('Error deleting product:', err);
                return res.status(500).send('Error deleting product');
            }
            res.redirect('/products');
        });
    } else {
        res.redirect('/');
    }
});


// Validate danh mục
function validateCategory(cateid, catename) {
    const errors = [];
    
    if (!cateid) {
        errors.push('Mã danh mục không được để trống');
    } else if (!/^[A-Za-z0-9_-]+$/.test(cateid)) {
        errors.push('Mã danh mục chỉ được chứa chữ cái, số, gạch dưới và gạch ngang');
    }

    if (!catename) {
        errors.push('Tên danh mục không được để trống');
    } else if (catename.length < 2 || catename.length > 100) {
        errors.push('Tên danh mục phải từ 2-100 ký tự');
    }

    return errors;
}



// Categories Management
app.get('/categories', (req, res) => {
    if (req.session.loggedin) {
        const query = 'SELECT * FROM category ORDER BY cateid';
        db.query(query, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.render('error', {
                    message: 'Lỗi truy vấn danh mục',
                    error: err
                });
            }
            
            res.render('categories', { 
                categories: results,
                success: req.flash('success'),
                error: req.flash('error'),
                message: results.length === 0 ? 'Không có danh mục nào' : null 
            });
        });
    } else {
        res.redirect('/');
    }
});

// Trang thêm category (GET)
app.get('/add-category', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/');
    }
    res.render('add_categories', {
        error: null,
        oldInput: null
    });
});

// Xử lý thêm category (POST)
app.post('/add-category', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/');
    }

    const { cateid, catename } = req.body;
    
    // Validate dữ liệu
    const errors = validateCategory(cateid, catename);
    
    if (errors.length > 0) {
        return res.render('add_categories', {
            error: errors[0],
            oldInput: { cateid, catename }
        });
    }

    // Kiểm tra trùng cateid
    const checkQuery = 'SELECT * FROM category WHERE cateid = ?';
    db.query(checkQuery, [cateid], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking category:', checkErr);
            return res.render('add_categories', {
                error: 'Lỗi hệ thống',
                oldInput: { cateid, catename }
            });
        }

        if (checkResults.length > 0) {
            return res.render('add_categories', {
                error: 'Mã danh mục đã tồn tại',
                oldInput: { cateid, catename }
            });
        }

        // Thêm danh mục mới
        const insertQuery = 'INSERT INTO category (cateid, catename) VALUES (?, ?)';
        db.query(insertQuery, [cateid, catename], (err) => {
            if (err) {
                console.error('Error adding category:', err);
                return res.render('add_categories', {
                    error: 'Lỗi khi thêm danh mục: ' + err.sqlMessage,
                    oldInput: { cateid, catename }
                });
            }
            
            req.flash('success', 'Thêm danh mục thành công');
            res.redirect('/categories');
        });
    });
});

// Trang sửa category (GET)
app.get('/edit-category/:id', (req, res) => {
    if (req.session.loggedin) {
        const categoryId = req.params.id;
        const query = 'SELECT * FROM category WHERE cateid = ?';
        
        db.query(query, [categoryId], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.render('error', {
                    message: 'Lỗi truy vấn danh mục',
                    error: err
                });
            }
            
            if (results.length === 0) {
                req.flash('error', 'Không tìm thấy danh mục');
                return res.redirect('/categories');
            }
            
            res.render('edit_categories', { 
                category: results[0],
                error: null 
            });
        });
    } else {
        res.redirect('/');
    }
});

// Xử lý sửa category (POST)
app.post('/edit-category/:id', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/');
    }

    const originalCateId = req.params.id;
    const { cateid, catename } = req.body;

    // Validate dữ liệu
    const errors = validateCategory(cateid, catename);
    
    if (errors.length > 0) {
        return res.render('edit_categories', {
            error: errors[0],
            category: { cateid: originalCateId, catename }
        });
    }

    // Kiểm tra nếu thay đổi mã danh mục
    const checkQuery = 'SELECT * FROM category WHERE cateid = ? AND cateid != ?';
    db.query(checkQuery, [cateid, originalCateId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking category:', checkErr);
            return res.render('edit_categories', {
                error: 'Lỗi hệ thống',
                category: { cateid: originalCateId, catename }
            });
        }

        if (checkResults.length > 0) {
            return res.render('edit_categories', {
                error: 'Mã danh mục mới đã tồn tại',
                category: { cateid: originalCateId, catename }
            });
        }

        // Bắt đầu transaction
        db.beginTransaction((err) => {
            if (err) {
                console.error('Transaction error:', err);
                return res.render('edit_categories', {
                    error: 'Lỗi hệ thống',
                    category: { cateid: originalCateId, catename }
                });
            }

            // Cập nhật category
            const updateCategoryQuery = 'UPDATE category SET cateid = ?, catename = ? WHERE cateid = ?';
            db.query(updateCategoryQuery, [cateid, catename, originalCateId], (updateCategoryErr) => {
                if (updateCategoryErr) {
                    return db.rollback(() => {
                        console.error('Error updating category:', updateCategoryErr);
                        res.render('edit_categories', {
                            error: 'Lỗi khi cập nhật danh mục',
                            category: { cateid: originalCateId, catename }
                        });
                    });
                }

                // Cập nhật khóa ngoại trong bảng product
                const updateProductQuery = 'UPDATE product SET cateid = ? WHERE cateid = ?';
                db.query(updateProductQuery, [cateid, originalCateId], (updateProductErr) => {
                    if (updateProductErr) {
                        return db.rollback(() => {
                            console.error('Error updating products:', updateProductErr);
                            res.render('edit_categories', {
                                error: 'Lỗi khi cập nhật sản phẩm thuộc danh mục',
                                category: { cateid: originalCateId, catename }
                            });
                        });
                    }

                    // Commit transaction
                    db.commit((commitErr) => {
                        if (commitErr) {
                            return db.rollback(() => {
                                console.error('Commit error:', commitErr);
                                res.render('edit_categories', {
                                    error: 'Lỗi khi lưu thay đổi',
                                    category: { cateid: originalCateId, catename }
                                });
                            });
                        }

                        req.flash('success', 'Cập nhật danh mục thành công');
                        res.redirect('/categories');
                    });
                });
            });
        });
    });
});

// Xóa category
app.get('/delete-category/:id', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/');
    }

    const categoryId = req.params.id;

    // Kiểm tra xem danh mục có sản phẩm không
    const checkProductQuery = 'SELECT COUNT(*) AS productCount FROM product WHERE cateid = ?';
    db.query(checkProductQuery, [categoryId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking products:', checkErr);
            req.flash('error', 'Lỗi hệ thống khi kiểm tra sản phẩm');
            return res.redirect('/categories');
        }

        const productCount = checkResults[0].productCount;

        // Nếu có sản phẩm thuộc danh mục
        if (productCount > 0) {
            req.flash('error', `Không thể xóa danh mục. Đang có ${productCount} sản phẩm thuộc danh mục này`);
            return res.redirect('/categories');
        }

        // Thực hiện xóa danh mục
        const deleteQuery = 'DELETE FROM category WHERE cateid = ?';
        db.query(deleteQuery, [categoryId], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error('Error deleting category:', deleteErr);
                req.flash('error', 'Lỗi khi xóa danh mục');
                return res.redirect('/categories');
            }

            // Kiểm tra xem có dòng nào bị ảnh hưởng không
            if (deleteResult.affectedRows > 0) {
                req.flash('success', 'Xóa danh mục thành công');
            } else {
                req.flash('error', 'Không tìm thấy danh mục để xóa');
            }

            res.redirect('/categories');
        });
    });
});
   
// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).send('Something broke!');
});

// 404 Not Found middleware
app.use((req, res, next) => {
    res.status(404).render('404');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});