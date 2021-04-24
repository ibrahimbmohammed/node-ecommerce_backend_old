const { db, admin } = require("../utilities/admin");
const config = require("../utilities/config");
const firebase = require("firebase");
firebase.initializeApp(config);

exports.getAllProducts = (req, res) => {
  db.collection("products")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      const products = [];
      data.forEach(doc => {
        products.push({ body: doc.data(), id: doc.id });
      });
      return res.json(products);
    })
    .catch(err => console.error(err));
};
exports.getAllProductss = (req, res) => {
  const products = {};
  db.collection("products")
    .orderBy("createdAt", "desc")
    .limit(6)
    .get()
    .then(data => {
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
    .catch(err => console.error(err));
};
exports.getLatestProducts = (req, res) => {
  db.collection("products")
    .orderBy("createdAt", "desc")
    .limit(3)
    .get()
    .then(data => {
      const products = [];
      data.forEach(doc => {
        products.push(doc.data());
      });
      return res.json(products);
    })
    .catch(err => console.error(err));
};
exports.getLatestProductsHome = (req, res) => {
  db.collection("products")
    .orderBy("createdAt", "desc")
    .limit(3)
    .get()
    .then(data => {
      const products = [];
      data.forEach(doc => {
        products.push(doc.data());
      });
      return res.json(products);
    })
    .catch(err => console.error(err));
};

// SUBSEQUENT DATA FROM HOME
exports.getLatestProductsHomepost = (req, res) => {
  const products = {};
  
  const lastVisible = ({ createdAt } = req.body);
  console.log(lastVisible);
  db.collection("products")
    .orderBy("createdAt", "desc")
    .startAt(createdAt)
    .limit(6)
    .get()
    .then(querySnapshot => {
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
//  GET SINGLE ITEMS
exports.getSingleItem = (req, res) => {
  let itemData = {};
  db.doc(`/products/${req.params.itemId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "item not found" });
      }
      itemData = doc.data();
      itemData.itemId = doc.id;
    })
    .then(() => {
      return res.json(itemData);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

/// expriment
// exports.getLatestProductsHome = (req, res) => {
//   var first = db.collection("products")
//   .orderBy("createdAt", "desc")
//   .limit(6);

// return first.get().then(function (documentSnapshots) {
// // Get the last visible document
// var lastVisible = documentSnapshots.docs[documentSnapshots.docs.length-1];
// console.log("last", lastVisible);

// // Construct a new query starting at this document,
// // get the next 25 cities.
// var next = db.collection("products")
//     .orderBy("createdAt", "desc")
//     .startAfter(lastVisible)
//     .limit(6)
//     .catch(err => console.error(err));
// }
// }

//end experiment
exports.deleteProduct = (req, res) => {
  const productDoc = db.doc(`/products/${req.params.Id}`);
  productDoc
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "product does not exist" });
      } else {
        return productDoc.delete();
      }
    })
    .then(doc => {
      return res.json({ message: "item deleted", doc });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
exports.addProducts = (req, res) => {
  const {
    image_url,
    product_cat,
    product_new,
    product_quantity,
    name,
    price,
    description,
    product_sec_cat
  } = req.body;
  const createdAt = new Date().toISOString();

  const newItem = {
    image_url,
    product_cat,
    product_new,
    product_quantity,
    name,
    price,
    description,
    createdAt,
    product_sec_cat
  };
  db.collection("products")
    .add(newItem)
    .then(doc => {
      res.status(201).json(doc.id);
    })
    .catch(err => console.error(err));
};

exports.addProductImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        let imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return imageUrl;
      })
      .then(imageUrl => {
        return res.json({ imageUrl, message: "image uploaded successfully" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
