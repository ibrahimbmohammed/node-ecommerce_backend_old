const functions = require("firebase-functions");
const { db } = require("./utilities/admin");
const express = require("express");
const { FBAuth } = require("./utilities/admin");
const app = express();
const cors = require("cors");
app.use(cors({ origin: true }));

const {
  getAllProducts,
  getAllProductss,
  addProducts,
  addProductImage,
  getLatestProducts,
  deleteProduct,
  getLatestProductsHome,
  getLatestProductsHomepost,
  getSingleItem
} = require("./handlers/products");
const {
  signUp,
  signIn,
  getUserCart,
  addItemToCart,
  removeItemFromCart,
  getItemByCategory,
  getItemByCategoryMore,
  cartIncreament,
  cartDecreament,
  getAllCategory,
  getAllCategoryMore,
  payment
} = require("./handlers/customers");
// GET  ROUTES
app.get("/products", getAllProducts);
app.get("/productss", getAllProductss);
app.get("/products/latest", getLatestProducts);
app.get("/products/homepage", getLatestProductsHome);
app.get("/products/:itemId", getSingleItem);
// DELETE ROUTE
app.get("/products/delete/:Id", deleteProduct);

// POST ROUTES
app.post("/products", addProducts);
app.post("/products/homepagepost", getLatestProductsHomepost);
app.post("/products/image", addProductImage);

// CUSTOMERS ROUTES
app.post("/signUp", signUp);
app.post("/signIn", signIn);
app.get("/products/addCart/:itemId", FBAuth, addItemToCart);
app.get("/removeCart/:itemId", FBAuth, removeItemFromCart);
app.post("/products/categories/:category", getItemByCategoryMore);
app.get("/user/cartIncreament/:itemId", FBAuth, cartIncreament);
app.get("/user/cartDecreament/:itemId", FBAuth, cartDecreament);
// CUSTOMER GET ROUTES
app.get("/user/cart", FBAuth, getUserCart);
app.get("/products/category/:category", getItemByCategory);
app.get("/products/categorys/:category", getAllCategory);
app.get("/products/categorys/:category", getAllCategoryMore);

//PAYMENT ROUTE
app.post("/user/payment", payment);

exports.api = functions.region("europe-west1").https.onRequest(app);

// DATABASE TRIGGERS
exports.onProductDelete = functions
  .region("europe-west1")
  .firestore.document("/products/{itemId}")
  .onDelete((snapshot, context) => {
    const itemId = context.params.itemId;
    const batch = db.batch();
    console.log(itemId);
    return db
      .collection("cart")
      .where("itemId", "==", itemId)
      .get()
      .then(data => {
        console.log(data);
        data
          .forEach(doc => {
            batch.delete(db.doc(`/cart/${doc.id}`));
            return batch.commit();
          })
          .catch(err => console.error(err));
      });
  });
