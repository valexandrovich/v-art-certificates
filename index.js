const express = require('express');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const Ajv = require('ajv');
const Jimp = require('jimp');

const app = express();
const port = 3000;

app.use(cors());

// const upload = multer();
// const upload = multer({ storage: multer.memoryStorage() });
// const upload = multer({ storage: multer.memoryStorage() }).any();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // You can change this to any folder where you want to save files
    },
    filename: function (req, file, cb) {
        // You might want to change the file name, this is just a simple example
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({storage: storage}).fields([{name: 'preview_image', maxCount: 1}]);

// const ajv = new Ajv();

// const schema = {
//     type: "object",
//     properties: {
//         preview_image: { type: "string" },
//         author: { type: "string" },
//         name: { type: "string" },
//         year: { type: "string" },
//         edition: { type: "string" },
//         quantity: { type: "integer" },
//         url: { type: "string" },
//         currency: { enum: ["ethereum", "near"] },
//         contract: { type: "string" },
//         genre: { type: "string" },
//         dimensions: { type: "string" },
//         slug_link: { type: "string" },
//         copyrights: {
//             type: "array",
//             items: {
//                 type: "string",
//                 enum: [
//                     "adaption",
//                     "storage",
//                     "placement",
//                     "publication",
//                     "metadata",
//                     "demonstration",
//                     "personal_use",
//                     "advertising"
//                 ]
//             }
//
//         },
//         token_id: { type: "string" },
//         creation_date: { type: "string" },
//     },
//     required: ["preview_image", "author", "name", "year", "edition", "quantity", "url",
//         "currency", "contract", "genre", "dimensions", "slug_link", "copyrights",
//         "token_id", "creation_date"
//     ],
//     additionalProperties: false
// }

// const validate = ajv.compile(schema);

app.post('/createCertificate', upload, (req, res) => {

    const certFileName = Date.now() + '_certificate.pdf';

    const files = req.files;
    if (!files || !files.preview_image || files.preview_image.length === 0) {
        return res.status(400).send('No preview image uploaded.');
    }
    const imageFile = files.preview_image[0];



    const body = req.body
    const doc = new PDFDocument({size: [3508, 2480]});
    // const filename = `Certificate.pdf`;


    const backgroundPath = path.join(__dirname, 'cert_blank.png');

// Ensure the image file exists
    if (fs.existsSync(backgroundPath)) {
        // Draw the image to cover the entire page
        doc.image(backgroundPath, 0, 0, { width: doc.page.width, height: doc.page.height });
    } else {
        console.error('Background image not found');
        // Handle the error appropriately
    }

    const filePath = path.join(__dirname, 'certificates', certFileName);
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(25).text('Certificate', 100, 80);
    doc.text(`ID: ` + body.token_id, 100, 120);

    const imagePath = imageFile.path;
    doc.image(imagePath, 100, 250, { fit: [450, 700] });
    // doc.text(`Name: ${name}`, 100, 160);
    // doc.text(`Birthday: ${birthday}`, 100, 200);
    doc.end();
    res.json({downloadUrl: `http://${req.headers.host}/downloadCertificate/` +certFileName});

    // res.status(200).json({ message: 'Certificate created successfully' });
});

// GET endpoint to download a certificate
app.get('/downloadCertificate/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'certificates', filename);

    // Check if file exists
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});