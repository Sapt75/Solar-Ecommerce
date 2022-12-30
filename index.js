const express = require('express')
let ejs = require('ejs');
let bodyParser = require('body-parser')

const mysql = require('mysql')

var session = require('express-session')






const app = express()
const port = 3000
app.set('view engine', 'ejs')


app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({ secret: 'secret' }))




function isProductInCart(cart, product) {

    //Checking if product in cart and decreasing the quantity if product is there.
    if (product.decrease_product_quantity_btn) {
        for (i = 0; i < cart.length; i++) {
            if (cart[i].name == product.name) {
                cart[i].quantity = parseInt(cart[i].quantity) - 1
                return true
            }
        }
    } else {

        //Checking if product in cart and increasing the quantity if product is there.
        for (i = 0; i < cart.length; i++) {
            if (cart[i].name == product.name) {
                cart[i].quantity = parseInt(cart[i].quantity) + 1
                return true
            }
        }
    }
    return false
}


app.get('/', (req, res) => {
    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node project'
    })

    con.query("SELECT * FROM products", (err, result) => {
        res.render('pages/index', { result: result })
    })

})

app.post('/add_to_cart', (req, res) => {

    var product = req.body

    if (req.session.cart) {
        var cart = req.session.cart

        if (!isProductInCart(cart, product)) {
            cart.push(product)
        }
    } else {
        req.session.cart = [product]
        var cart = req.session.cart
    }




    //Calculate Total Amount
    let cost = 0;
    const calculateTotal = (cart) => {

        cart.forEach(element => {
            cost = cost + (parseFloat(element.price) * element.quantity)
        });
        req.session.cost = cost.toFixed(2)
        res.redirect('/cart')
    }

    calculateTotal(cart)

})

app.post('/remove_from_cart', (req, res) => {
    var product = req.body
    req.session.cart = req.session.cart.filter((item) => {
        if (item.name != product.name) {
            return item
        }
    })

    //Calculate Total Cart Amount
    let cost = 0;
    const calculateTotal = (cart) => {

        cart.forEach(element => {
            cost = cost + (parseFloat(element.price) * element.quantity)
        });
        req.session.cost = cost.toFixed(2)
        res.redirect('/cart')
    }

    calculateTotal(req.session.cart)
})

app.get('/cart', (req, res) => {
    res.render('pages/cart', { products: req.session.cart, cost: req.session.cost })
})

app.get('/products', (req, res) => {
    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node project'
    })

    con.query("SELECT * FROM products", (err, result) => {
        res.render('pages/products', { result: result })
    })
})

app.get('/about', (req, res) => {
    res.render('pages/about')
})

app.get('/single_product', (req,res)=>{
    let id = req.query.id

    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node project'
    })

    con.query("SELECT * FROM products WHERE id='"+id+"'", (err, result) => {
        res.render('pages/single_product', { result: result })
    })
})

app.get('/checkout', (req, res) => {
    if (req.session.cart) {
        res.render('pages/checkout', { cost: req.session.cost })
    } else {
        res.render('pages/forbidden')
    }
})

app.get('/payment', (req, res) => {
    let total = req.session.cost
    res.render('pages/payment', {total:total})
})

app.post('/place_order', (req, res) => {
    var status = 'not paid'
    var date = new Date()
    var products_ids = ''
    var cart = req.session.cart
    var id = Date.now()
    req.session.order_id = id

    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node project'
    })

    //Adding data into orders table in database 
    for (i = 0; i < cart.length; i++) {
        products_ids = products_ids + cart[i].id + ","
    }

    con.connect((err) => {
        if (err) {
            console.log(err)
        } else {
            var query = 'INSERT INTO orders(id,cost,name,email,status,city,address,phone,date,products_ids) VALUES ?'
            var values = [[id,req.body.cost, req.body.name, req.body.email, status, req.body.city, req.body.address, req.body.phone, date, products_ids]]

            con.query(query, [values], (err, result) => {
                if (err) {
                    console.log(err)
                } else {
                    //Adding data into order_items table in database

                    for (i = 0; i < cart.length; i++) {
                        var query = 'INSERT INTO order_items(order_id,product_id,product_name,product_price,product_image,product_quantity,order_date) VALUES ?'
                        var values = [[id, cart[i].id, cart[i].name, cart[i].price, cart[i].image, cart[i].quantity, date]]
                        con.query(query, [values], (err, result) => { })
                    }

                    res.redirect('/payment')
                }
            })
        }
    })

})

app.get('/thank_you', (req,res)=>{
    res.render('pages/thank_you', {order_id:req.session.order_id})
})


app.get('/verify_payment', (req,res)=>{
    var transaction_id = req.query.transaction_id
    var order_id = req.session.order_id

    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node project'
    })

    con.connect((err) => {
        if (err) {
            console.log(err)
        } else {
            var query = 'INSERT INTO payments(order_id,transaction_id,date) VALUES ?'
            var values = [[order_id,transaction_id,new Date()]]
        }
        con.query(query, [values],(err,result)=>{
            if(err){
                console.log(err)
            }else{
                con.query("UPDATE orders SET status='paid' WHERE id='"+order_id+"'", (err,result)=>{})
                res.redirect('/thank_you')
            }
        })
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})