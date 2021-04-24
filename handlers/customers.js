const { db, admin } = require("../utilities/admin");
const config = require("../utilities/config"); //useless
const firebase = require("firebase");

const isEmpty = string => {
  if (string.trim() === " ") return true;
  else return false;
};
const isEmail = email => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

exports.signUp = (req, res) => {
  // Signup route
  const newUser = {
    handle: req.body.handle,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword
  };
  let errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = "Email must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address";
  }

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);
  // adding default image
  const noImg = "untitled.png";
  let token, userId;
  // validate data
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ handle: `this handle is already taken` });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      console.log(data);
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId
      };
      console.log(userCredentials);
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      console.log(token);
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
};

exports.signIn = (req, res) => {
  //user login
  let { email, password } = req.body;
  let user = {
    email,
    password
  };
  let errors = {};
  if (isEmpty(user.email)) errors.email = `Must not be empty`;
  if (isEmpty(password)) errors.password = `Must not be empty`;

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong credentails ,please try again" });
      } else return res.status(500).json({ error: err.code });
    });
};
// CUSTOMER CART DETAILS

exports.getUserCart = (req, res) => {
  //  reduce this
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("cart")
          .where("handle", "==", req.user.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    })
    .then(data => {
      userData.cart = [];
      if (data.empty) {
        return res.status(404).json({ message: "your cart is empty" });
      }
      data.forEach(doc => {
        userData.cart.push({
          createdAt: doc.data().createdAt,
          itemId: doc.data().itemId,
          image_url: doc.data().image_url,
          price: doc.data().price,
          quantity: doc.data().quantity,
          total: Number(doc.data().quantity) * Number(doc.data().price)
        });
      });
      return res.json(userData);
    })
    .catch(err => {
      res.status(500).json({ error: err.code });
    });
};
//ADD TO CART
exports.addItemToCart = (req, res) => {
  let itemData = {};
  db.doc(`/products/${req.params.itemId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "item not found" });
      }
      itemData = doc.data();
      itemData.itemId = doc.id;
      const cartItem = {
        createdAt: new Date().toISOString(),
        itemId: req.params.itemId,
        userId: req.user.userId,
        handle: req.user.handle,
        image_url: doc.data().image_url,
        price: doc.data().price,
        quantity: 1,
        total: 0
      };
      db.collection("cart")
        .add(cartItem)
        .then(() => {
          res.json({ message: "item added succesfully" });
        });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// REMOVE ITEMS FROM CART
exports.removeItemFromCart = (req, res) => {
  //   const cartItem = [];
  const cartItem = db
    .collection("cart")
    .where("itemId", "==", req.params.itemId)
    .where("handle", "==", req.user.handle)
    .limit(1)
    .get()
    .then(data => {
      if (!data.empty) {
        const products = [];
        data.forEach(doc => {
          products.push(doc.id);
        });
        return products[0];
      } else {
        return res.json({ error: "item not found" });
      }
    })
    .then(data => {
      return db.doc(`/cart/${data}`).delete();
    })
    .then(() => {
      res.json({ message: "kudos" });
    })

    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//INCREASING CART QUANTITY
exports.cartIncreament = (req, res) => {
  // const decrement = firebase.firestore.FieldValue.increment(-1);
  // const increment = firebase.firestore.FieldValue.increment(1);
  const cartItem = db
    .collection("cart")
    .where("itemId", "==", req.params.itemId)
    .where("handle", "==", req.user.handle)
    .limit(1)
    .get()
    .then(doc => {
      if (!doc.empty) {
        const products = [];
        doc.forEach(doc => {
          products.push(doc.id);
        });
        return products[0];
        //return doc.ref.update({ quantity: doc.data().quantity + 1 });
      } else {
        return res.status(404).json({ error: "item not found" });
      }
    })
    .then(data => {
      console.log(data);
      return db
        .doc(`/cart/${data}`)
        .get()
        .then(doc => {
          if (!doc.exists) {
            return res.status(404).json({ error: "post not found" });
          }
          return doc.ref.update({
            quantity: doc.data().quantity + 1
            // total: doc.data().price * doc.data().quantity
          });
        });
    })
    .then(() => {
      res.json({ message: "item increased" });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "something went wrong" });
    });
};

//DECREASING CART QUANTITY
exports.cartDecreament = (req, res) => {
  const cartItem = db
    .collection("cart")
    .where("itemId", "==", req.params.itemId)
    .where("handle", "==", req.user.handle)
    .limit(1)
    .get()
    .then(doc => {
      if (!doc.empty) {
        const products = [];
        doc.forEach(doc => {
          products.push(doc.id);
        });
        return products[0];
        //return doc.ref.update({ quantity: doc.data().quantity + 1 });
      } else {
        return res.status(404).json({ error: "item not found" });
      }
    })
    .then(data => {
      console.log(data);
      return db
        .doc(`/cart/${data}`)
        .get()
        .then(doc => {
          if (!doc.exists) {
            return res.status(404).json({ error: "post not found" });
          }
          return doc.ref.update({ quantity: doc.data().quantity - 1 });
        });
    })
    .then(() => {
      res.json({ message: "item decreased" });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "something went wrong" });
    });
};
/////////////////////////////////////////////////////////////////work on this  ////////
// GET ITEM BY CATEGORY
exports.getItemByCategory = (req, res) => {
  db.collection("products")
    .where("product_cat", "==", req.params.category)
    .orderBy("createdAt", "desc")
    .limit(7)
    .get()
    .then(data => {
      const products = {};
      if (data.empty) {
        return res.status(404).json({ message: "no product found" });
      }
      products.data = [];
      data.forEach(doc => {
        products.data.push({
          name: doc.data().name,
          price: doc.data().price,
          createdAt: doc.data().createdAt,
          description: doc.data().description,
          image_url: doc.data().image_url,
          product_cat: doc.data().product_cat,
          product_new: doc.data().product_new,
          product_quantity: doc.data().product_quantity,
          itemId: doc.id
        });
      });
      return res.json(products);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
  // }
};
/// ALL CATEGORIES
exports.getAllCategory = (req, res) => {
  cartDocument = db
    .collection("products")
    .where("product_sec_cat", "==", req.params.category)
    .orderBy("createdAt", "desc")
    .limit(6)
    .get()
    .then(data => {
      const products = {};
      if (data.empty) {
        return res.status(404).json({ message: "no product found" });
      }
      products.data = [];
      data.forEach(doc => {
        products.data.push({
          name: doc.data().name,
          price: doc.data().price,
          createdAt: doc.data().createdAt,
          description: doc.data().description,
          image_url: doc.data().image_url,
          product_cat: doc.data().product_cat,
          product_new: doc.data().product_new,
          product_quantity: doc.data().product_quantity,
          itemId: doc.id
        });
      });
      return res.json(products);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//MORE ROUTE
exports.getAllCategoryMore = (req, res) => {
  const lastVisible = ({ createdAt } = req.body);
  console.log(lastVisible);
  db.collection("products")
    .where("product_sec_cat", "==", req.params.category)
    .orderBy("createdAt", "desc")
    .startAt(lastVisible)
    .limit(6)
    .get()
    .then(querySnapshot => {
      const products = {};
      if (querySnapshot.empty) {
        return res.status(404).json({ message: "no product found" });
      }
      products.data = [];
      querySnapshot.forEach(doc => {
        products.data.push({
          name: doc.data().name,
          price: doc.data().price,
          createdAt: doc.data().createdAt,
          description: doc.data().description,
          image_url: doc.data().image_url,
          product_cat: doc.data().product_cat,
          product_new: doc.data().product_new,
          product_quantity: doc.data().product_quantity,
          itemId: doc.id
        });
      });
      return res.json(products);
    })
    .catch(err => console.error(err));
};

// PAYMENT
exports.payment = async (req, res) => {
  const stripe = require("stripe")(
    "sk_test_hRXI34mHA496SoTjBv9LMKnn00AQzix8cP"
  );
  const uuid = require("uuid/v4");
  let error;
  let status;
  try {
    const { item, token } = req.body;

    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id
    });

    const idempotency_key = uuid();
    const charge = await stripe.charges.create(
      {
        amount: item.price * 100,
        currency: "ngn",
        customer: customer.id,
        receipt_email: token.email,
        description: `Purchased the ${item.name}`,
        shipping: {
          name: token.card.name,
          address: {
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip
          }
        }
      },
      {
        idempotency_key
      }
    );
    console.log("Charge:", { charge });
    status = "success";
  } catch (error) {
    console.error("Error:", error);
    status = "failure";
  }

  res.json({ error, status });
};
// SUBSEQUENT CATEGORIES QUERY
exports.getItemByCategoryMore = (req, res) => {
  const lastVisible = ({ createdAt } = req.body);
  console.log(lastVisible);
  db.collection("products")
    .where("product_cat", "==", req.params.category)
    .orderBy("createdAt", "desc")
    .startAt(lastVisible)
    .limit(6)
    .get()
    .then(querySnapshot => {
      const products = {};
      if (querySnapshot.empty) {
        return res.status(404).json({ message: "no product found" });
      }
      products.data = [];
      querySnapshot.forEach(doc => {
        products.data.push({
          name: doc.data().name,
          price: doc.data().price,
          createdAt: doc.data().createdAt,
          description: doc.data().description,
          image_url: doc.data().image_url,
          product_cat: doc.data().product_cat,
          product_new: doc.data().product_new,
          product_quantity: doc.data().product_quantity,
          itemId: doc.id
        });
      });
      return res.json(products);
    })
    .catch(err => console.error(err));
};
