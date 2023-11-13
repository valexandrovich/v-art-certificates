const express = require('express');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
// const Ajv = require('ajv');
// const Jimp = require('jimp');
const qrCode = require('qrcode');

const app = express();
const port = 3023;

app.use(cors());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // You can change this to any folder where you want to save files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({storage: storage}).fields([{name: 'preview_image', maxCount: 1}]);

app.get('/api/tst', (req, res) => {
    res.status(400).json({message: 'Test is passed'})
})

app.post('/api/certificates/v2', upload,
    async (req, res) => {

        try {
            const certFileName = Date.now() + '_certificate.pdf';
            const result = await buildCertificateFile(req, certFileName);
            console.log(result)
            res.json({downloadUrl: `http://${req.headers.host}/download/` + certFileName});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'An error occurred', error: error.message});
        }

    });

// GET endpoint to download a certificate
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'certificates', filename);
    //
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


function getCurrentUTCDateTime() {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth() returns 0-11
    const day = String(now.getUTCDate()).padStart(2, '0');

    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function buildCertificateFile(req, certFileName) {
    return new Promise(async (resolve, reject) => {

            const nowTime = getCurrentUTCDateTime();

            const body = req.body

            const files = req.files;
            if (!files || !files.preview_image || files.preview_image.length === 0) {
                reject('No preview image uploaded.')
            }
            const imageFile = files.preview_image[0];

            const filePath = path.join(__dirname, 'certificates', certFileName);
            fs.mkdirSync(path.dirname(filePath), {recursive: true});

            // PAGE 1
            const doc = new PDFDocument({size: [1080, 1528], margin: 0});
            const backgroundPath = path.join(__dirname, 'cert_1.png');
            if (fs.existsSync(backgroundPath)) {
                doc.image(backgroundPath, 0, 0, {width: doc.page.width, height: doc.page.height});
            } else {
                console.error('Background image not found');
            }

            doc.fontSize(16).text(nowTime, 850, 52);
            doc.fontSize(16).text('UTC CONFIRMED', 850, 73);


            doc.image(imageFile.path, 290, 150, {
                fit: [500, 500],
                align: 'center',
                valign: 'center'// Scale the image to 250x300 (optional)
            });

            const qrCodeDataURL = await qrCode.toDataURL(`http://${req.headers.host}/download/` + certFileName);
            doc.image(qrCodeDataURL, 40, 870,
                {
                    fit: [200, 200],
                    align: 'center',
                    valign: 'center'
                });


            doc.fontSize(20).fillColor('#4a4a4a').text(body.licence_from, 48, 1420)
            doc.fontSize(20).fillColor('#4a4a4a').text(body.licence_to, 216, 1420)

            doc.fontSize(20).fillColor('#4a4a4a').text(body.creative_asset, 553, 957)
            doc.fontSize(20).fillColor('#4a4a4a').text(body.biography, 553, 1050)
            doc.fontSize(20).fillColor('#4a4a4a').text(body.goal, 553, 1115)
            doc.fontSize(20).fillColor('#4a4a4a').text(body.licence_type, 553, 1182)

            doc.fontSize(20).fillColor('blue').text('IPFS LINK', 553, 1255);
            const textWidth = doc.widthOfString('IPFS LINK');
            const textHeight = doc.currentLineHeight();
            doc.moveTo(553, 1255 + textHeight).lineTo(553 + textWidth, 1255 + textHeight).strokeColor('blue').stroke();
            doc.link(553, 1255, textWidth, textHeight, body.url);

            doc.fontSize(20).fillColor('#4a4a4a').text(body.regions, 553, 1325)


            const eth_logo_path = path.join(__dirname, 'eth_logo.png');
            doc.image(eth_logo_path, 551, 1382, {
                fit: [24, 24],
                align: 'center',
                valign: 'center'// Scale the image to 250x300 (optional)
            });

            doc.fontSize(16).fillColor('#4a4a4a').text(body.contract, 575, 1388)
            doc.fontSize(16).fillColor('#4a4a4a').text(body.token_id, 553, 1455)


            // PAGE 2
            doc.addPage({size: [1080, 1528]});

            const backgroundPath2 = path.join(__dirname, 'cert_2.png'); // Replace with your second background image
            if (fs.existsSync(backgroundPath2)) {
                doc.image(backgroundPath2, 0, 0, {width: doc.page.width, height: doc.page.height});
            } else {
                console.error('Second background image not found');
            }

            doc.fontSize(20).fillColor('#4a4a4a').text(body.licence_from, 48 + 515, 1420)
            doc.fontSize(20).fillColor('#4a4a4a').text(body.licence_to, 216 + 515, 1420)


            if (body.copyrights.includes('adaption')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('Adaptation to the format/size required for digital placement\n' +
                    'on the platform/web resource/mobile application.', 70, 450, {width: 250})
            }

            if (body.copyrights.includes('storage')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('Storage of digital information, a file in a cloud data storage.', 400, 450, {width: 250})
            }
            if (body.copyrights.includes('placement')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('Placement and publication\n' +
                    'of NFT on the platform/web resource/mobile application.', 740, 450, {width: 250})
            }
            if (body.copyrights.includes('publication')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('Publication of a digital object\n' +
                    'on the Internet in the\n' +
                    'public domain.', 70, 620, {width: 250})
            }
            if (body.copyrights.includes('metadata')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('An entry in the metadata\n' +
                    'of the digital fingerprint\n' +
                    'of the file for authentication.', 400, 620, {width: 250})
            }
            if (body.copyrights.includes('demonstration')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('Digital display (demonstration) of an object in online or virtual galleries, AR/VR.', 740, 620, {width: 250})
            }
            if (body.copyrights.includes('advertising')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('Publications in printed and electronic catalogs, advertising for the subsequent sale\n' +
                    'of the digital artwork.', 70, 800, {width: 250})
            }
            if (body.copyrights.includes('personal_use')) {
                doc.fontSize(20).fillColor('#4a4a4a').text('Use of NFT for personal purposes and further\n' +
                    'resale as NFT.', 400, 800, {width: 250})
            }

            doc.image(qrCodeDataURL, 40, 1000,
                {
                    fit: [100, 100],
                    align: 'center',
                    valign: 'center'
                });

            doc.fontSize(14).fillColor('#808080').text('Asset biography', 550, 1000)
            doc.fontSize(16).fillColor('#4e4e4e').text(body.biography, 550, 1020)

            doc.fontSize(14).fillColor('#808080').text('Genre', 550, 1050)
            doc.fontSize(16).fillColor('#4e4e4e').text(body.genre, 550, 1070)

        doc.fontSize(14).fillColor('#808080').text('Dimensions', 550, 1100)
        doc.fontSize(16).fillColor('#4e4e4e').text(body.dimensions, 550, 1120)

        doc.fontSize(14).fillColor('#808080').text('Format', 550, 1150)
        doc.fontSize(16).fillColor('#4e4e4e').text(body.format, 550, 1170)

        doc.fontSize(14).fillColor('#808080').text('Original IP Token', 550, 1200)
        // doc.fontSize(16).fillColor('#4e4e4e').text(body.original_ip_token, 550, 1220)

        doc.fontSize(14).fillColor('blue').text('IP TOKEN LINK', 550, 1220);
        const textWidth2 = doc.widthOfString('IP TOKEN LINK');
        const textHeight2 = doc.currentLineHeight();
        doc.moveTo(550, 1220 + textHeight2).lineTo(550 + textWidth2, 1220 + textHeight2).strokeColor('blue').stroke();
        doc.link(550, 1220, textWidth2, textHeight2, body.original_ip_token);

            // PAGE 3
            // doc.addPage({size: [1080, 1528]});
            //
            // const backgroundPath3 = path.join(__dirname, 'cert_3.png'); // Replace with your second background image
            // if (fs.existsSync(backgroundPath3)) {
            //     doc.image(backgroundPath3, 0, 0, {width: doc.page.width, height: doc.page.height});
            // } else {
            //     console.error('Third background image not found');
            // }
            //
            // doc.fillColor('#4a4a4a').fontSize(22).text('PAGE 3', 250, 1430);


            doc.pipe(fs.createWriteStream(filePath));
            doc.end();

            resolve(doc)

        }
    )
}