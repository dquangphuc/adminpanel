// script.js

document.addEventListener('DOMContentLoaded', function() {
    // Xử lý đăng nhập
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Xử lý form thêm sản phẩm
    const addProductForm = document.getElementById('addProductForm');
    if(addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }

    // Xử lý form chỉnh sửa sản phẩm
    const editProductForm = document.getElementById('editProductForm');
    if(editProductForm) {
        editProductForm.addEventListener('submit', handleEditProduct);
    }

    // Khởi tạo các event listeners cho các nút xóa
    initializeDeleteButtons();

    // Xử lý preview ảnh khi upload
    const imageInput = document.getElementById('productImage');
    if(imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
});

// Hàm xử lý đăng nhập
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if(data.success) {
            window.location.href = '/admin/dashboard';
        } else {
            showAlert('Đăng nhập thất bại', 'error');
        }
    } catch(error) {
        showAlert('Có lỗi xảy ra', 'error');
    }
}

// Hàm xử lý thêm sản phẩm
async function handleAddProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const response = await fetch('/admin/products/add', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if(data.success) {
            showAlert('Thêm sản phẩm thành công', 'success');
            setTimeout(() => {
                window.location.href = '/admin/products';
            }, 1500);
        } else {
            showAlert('Thêm sản phẩm thất bại', 'error');
        }
    } catch(error) {
        showAlert('Có lỗi xảy ra', 'error');
    }
}

// Hàm xử lý chỉnh sửa sản phẩm
async function handleEditProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productId = e.target.dataset.productId;

    try {
        const response = await fetch(`/admin/products/edit/${productId}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if(data.success) {
            showAlert('Cập nhật sản phẩm thành công', 'success');
            setTimeout(() => {
                window.location.href = '/admin/products';
            }, 1500);
        } else {
            showAlert('Cập nhật sản phẩm thất bại', 'error');
        }
    } catch(error) {
        showAlert('Có lỗi xảy ra', 'error');
    }
}

// Hàm xử lý xóa sản phẩm
async function handleDelete(id, type) {
    if(confirm('Bạn có chắc chắn muốn xóa?')) {
        try {
            const response = await fetch(`/admin/${type}/delete/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if(data.success) {
                document.getElementById(`item-${id}`).remove();
                showAlert('Xóa thành công', 'success');
            } else {
                showAlert('Xóa thất bại', 'error');
            }
        } catch(error) {
            showAlert('Có lỗi xảy ra', 'error');
        }
    }
}

// Hàm xử lý preview ảnh
function handleImagePreview(e) {
    const preview = document.getElementById('imagePreview');
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = function() {
        preview.src = reader.result;
        preview.style.display = 'block';
    }

    if(file) {
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }
}

// Hàm khởi tạo các nút xóa
function initializeDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            handleDelete(id, type);
        });
    });
}

// Hàm hiển thị thông báo
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Hàm xử lý đăng xuất
async function handleLogout() {
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST'
        });

        const data = await response.json();
        if(data.success) {
            window.location.href = '/admin/login';
        }
    } catch(error) {
        showAlert('Có lỗi xảy ra', 'error');
    }
}

// Hàm xử lý tìm kiếm
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.searchable-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if(text.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Hàm format tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Export các hàm để có thể sử dụng từ các file khác
window.handleDelete = handleDelete;
window.handleLogout = handleLogout;
window.handleSearch = handleSearch;
window.formatCurrency = formatCurrency;