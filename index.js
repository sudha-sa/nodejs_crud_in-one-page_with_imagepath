import bodyParser from "body-parser";
import express from "express";
import NodeCache from "node-cache";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import path from 'path'; // Added to use path.extname
import { fileURLToPath } from 'url';

const app = express();
const uploadDir = './uploads';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const port = 3000;
const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 });
// Cache with a TTL of 100 seconds and check period of 120 seconds


//connection mongodb
mongoose.connect('mongodb://127.0.0.1:27017/demo2-database')
    .then(() => console.log("mongoDB connected"))
    .catch((err) => console.log("mongoDb error", err))



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Create the uploads folder if it doesn't exist


if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}




//schema creation
const userSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    password: {
        type: String,
    },
    details: {
        pincode: {
            type: Number,
        },
        address: {
            type: String,
        },
        location: {
            type: String,
        }
    },
    profilePicture: {
        type: String,
    },
    dob: {
        type: String,
    },
    key: {
        type: Number,
    },
    photo: {
        type: String,
    },
    photopath: {
        type: String,
    },
    photos: {
        type: Array,
    },
    _id: {
        type: String,
        required: true,
        unique: true,
        default: () => new mongoose.Types.ObjectId().toString().substring(0, 10).replace(/\d/g, '').toUpperCase(),
        // default: () => new mongoose.Types.ObjectId().toString().replace(/\D/g, ''),
        // default: () => new mongoose.Types.ObjectId().toString().substring(0, 10),
        // default: () => Math.floor(1000000000 + Math.random() * 9000000000).toString(),

    },
})

//model
const User = mongoose.model('user', userSchema)

app.use(express.json());
app.use(bodyParser.json());



// Create a POST route for file uploads
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }
        console.log(file)

        const data = {
            photo: req.file.filename,
            photopath: req.file.path.replace(/\\/g, '/')
        }
        console.log(req.file.filename, 'photo h')

        const saveImg = await User.create(data);
        console.log(saveImg, 'saveimg is here')
        res.status(200).send({
            message: 'File uploaded successfully',
            file: saveImg,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            message: 'Failed to upload file',
        });
    }
});


// Route to handle multiple image uploads
app.post('/uploadMultiple', upload.array('photos', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).send({ message: 'Please upload files' });
        }
        // Log the files for debugging
        console.log('Uploaded files:', files);

        const imgData = {
            photos: files.map(file => ({ photo: file.filename, photopath: file.path.replace(/\\/g, '/') })),
        };
        


        // Log the imgData for debugging
        console.log('Image data:', imgData);

        // Save the image data to the database
        const savedImgData = await User.create(imgData);
        res.status(200).send({
            message: 'Files uploaded successfully',
            files: savedImgData,
        });

    } catch (error) {
        console.error('Upload error:', error); // Improved error logging
        res.status(500).send({
            message: 'Failed to upload files',
            error: error.message || 'Unknown error'  // Include error message or a fallback message
        });
    }
});

app.get('/:filename', (req, res) => {
    const { filename } = req.params; 
    const filePath = path.join(__dirname, 'uploads', filename);

    // Send the image file
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('File not found or error:', err);
            res.status(404).send('Image not found');
        }
    });
});



app.get('/images/:id', async (req, res) => {
    try {
        const imageId = req.params.id;
        const imageData = await User.findById(imageId);

        if (!imageData) {
            return res.status(404).send({ message: 'Image not found' });
        }

        res.status(200).send(imageData);
    } catch (error) {
        console.error('Error fetching image data:', error);
        res.status(500).send({ 
            message: 'Failed to retrieve image data', 
            error: error.message || 'Unknown error' 
        });
    }
});












app.post('/api/add-details', async (req, res) => {
    try {
        const body = req.body;

        const data = {
            username: body.username,
            password: body.password,
            details: {
                pincode: body.pincode
            }
        }

        const result = await User.create(data);
        console.log('result', result);
        return res.status(201).json({ msg: "Successfully created", id: result._id });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(400).json({
            error: 400,
            status: 'failed',
            message: 'Failed to create user'
        });
    }
});

// app.post("/api/get-details", (req, res)=> {
//     console.log(req.body.key)
//     const cachedData = cache.get();
//     console.log(cachedData)

//     cache.get(req.body.key, dataget);
//     res.json({
//         status : 400,
//         success : true
//     })
// });


app.options("/api/get-details", (req, res) => {
    const key = req.body.key;

    if (typeof key !== 'string' && typeof key !== 'number') {
        return res.status(400).json({ error: 'Key must be a string or number' });
    }

    const cachedData = cache.get(key);

    if (cachedData) {
        return res.json({ data: cachedData });
    } else {
        return res.status(404).json({ error: 'Data not found in cache' });
    }
});


app.put("/api/update-details/:id", (req, res) => {
    const id = req.params;
    console.log(id)
    const key = req.body.key;
    const data = {
        username: req.body.username,
        password: req.body.password,
        details: {
            pincode: req.body.details.pincode,
            address: req.body.details.address,
            location: req.body.details.location
        },
        dob: req.body.dob,
        profilePicture: req.body.profilePicture,
        key: req.body.key
    }
    console.log(req.body)
    if (typeof key !== 'string' && typeof key !== 'number') {
        return res.status(400).json({ error: 'Key must be a string or number' });
    }

    const cachedData = cache.get(key);

    if (!cachedData) {
        return res.status(404).json({ error: 'Data not found in cache' });
    }
    cache.set(key, data);
    res.json({
        status: 200,
        success: true,
        updatedData: data
    })
})


app.delete("/api/delete-details/:id", (req, res) => {
    const id = req.params;
    console.log(id)
    const key = req.body.key;

    if (typeof key !== 'string' && typeof key !== 'number') {
        return res.status(400).json({ error: 'Key must be a string or number' });
    }

    const cachedData = cache.del(key);
    console.log(cachedData)
    if (!cachedData) {
        return res.status(404).json({ error: 'Data not found in cache' });
    }


    res.json({
        status: 200,
        success: true
    });
});




app.listen(port, () => {
    console.log("Hello sudha your node js server is running on...", `http://localhost:${port}`);
});
