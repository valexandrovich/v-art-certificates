const express = require('express');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const qrCode = require('qrcode');

const app = express();
const port = 80;
const host = 'http://localhost'
// const host = 'https://certificate.v-art.digital'

app.use(cors());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({storage: storage}).fields([{name: 'preview_image', maxCount: 1}]);


app.post('/api/certificates/v2/license', upload,
    async (req, res) => {

        try {
            const certFileName = Date.now() + '_license_certificate.pdf';
            const result = await buildLicenseCertificateFile(req, certFileName);
            // console.log(result)
            res.json({downloadUrl: host + `/download/` + certFileName});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'An error occurred', error: error.message});
        }

    });

app.post('/api/certificates/v2/token', upload,
    async (req, res) => {

        try {
            const certFileName = Date.now() + '_token__certificate.pdf';
            const result = await buildTokenCertificateFile(req, certFileName);
            // console.log(result)
            res.json({downloadUrl: host + `/download/` + certFileName});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'An error occurred', error: error.message});
        }

    });

// GET endpoint to download a certificate
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    console.log(filename)
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

function buildLicenseCertificateFile(req, certFileName) {
    return new Promise(async (resolve, reject) => {

            const nowTime = getCurrentUTCDateTime();

            const body = req.body

            const files = req.files;
            if (!files || !files.preview_image || files.preview_image.length === 0) {
                reject('No preview image uploaded.')
            }
            const imageFile = files.preview_image[0];
            //
            const filePath = path.join(__dirname, 'certificates', certFileName);
            fs.mkdirSync(path.dirname(filePath), {recursive: true});

            // PAGE 1
            const doc = new PDFDocument({size: [1080, 1528], margin: 0});

            const font400 = path.join(__dirname, 'font/stolzl_400.otf'); // Replace with path to your bold font file


            const backgroundPath = path.join(__dirname, 'img/license_background_1.png');
            if (fs.existsSync(backgroundPath)) {
                doc.image(backgroundPath, 0, 0, {width: doc.page.width, height: doc.page.height});
            } else {
                console.error('Background image not found');
            }


            const pageWidth = 1080; // Standard A4 page width in points
            const rightPaddingInPixels = 48;
            doc.fontSize(16).font(font400);
            const textBlockWidth = 200;
            const xCoordForNowTime = pageWidth - textBlockWidth - rightPaddingInPixels;

            doc.text(nowTime, xCoordForNowTime, 52, {
                width: textBlockWidth,
                align: 'right'
            });

            doc.text('UTC CONFIRMED', xCoordForNowTime, 73, {
                width: textBlockWidth,
                align: 'right'
            });

            doc.image(imageFile.path, 290, 150, {
                fit: [500, 500],
                align: 'center',
                valign: 'center'
            });


            doc.fontSize(80);
            var text = 'License Certificate';
            var textWidth = doc.widthOfString(text);
            var docCenter = doc.page.width / 2;
            var textStart = docCenter - (textWidth / 2);
            doc.font(font400).text(text, textStart, 680);


            text = 'The license data, provenance, and associated cryptographic functions are timestamped on the Blokchain.'
            doc.fontSize(26);
            doc.font(font400).text(text, 57, 920, {
                width: 447,
                align: 'left'
            });


            text = 'Licensing period:'
            doc.fontSize(26);
            doc.font(font400).text(text, 57, 1338, {
                width: 447,
                align: 'left'
            });

            doc.fillOpacity(0.5);
            text = 'License start date'
            doc.fontSize(14);
            doc.font(font400).text(text, 57, 1398, {
                width: 220,
                align: 'left'
            });


            text = 'License end date (incl.)'
            doc.fontSize(14);
            doc.font(font400).text(text, 230, 1398, {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fontSize(14);
            doc.font(font400).text(body.licence_from, 57, 1421, {
                width: 220,
                align: 'left'
            });


            doc.fontSize(14);
            doc.font(font400).text(body.licence_to, 230, 1421, {
                width: 220,
                align: 'left'
            });


            var yStartPos = 920
            var yOffset = 80

            text = 'Digital asset'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 0), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.assetName, 555, yStartPos + (yOffset * 0) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'License granted by'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 1), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.grantedBy, 555, yStartPos + (yOffset * 1) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Goal'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 2), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.goal, 555, yStartPos + (yOffset * 2) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'License Type'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 3), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.licenseType, 555, yStartPos + (yOffset * 3) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Regions of License'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 4), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.regions, 555, yStartPos + (yOffset * 4) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Contract'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 5), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.contract, 555, yStartPos + (yOffset * 5) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Token ID'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 6), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.tokenId, 555, yStartPos + (yOffset * 6) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            //PAGE 2
            doc.addPage({size: [1080, 1528]});


            const backgroundPath2 = path.join(__dirname, 'img/license_background_2.png');

            if (fs.existsSync(backgroundPath2)) {
                doc.image(backgroundPath2, 0, 0, {width: doc.page.width, height: doc.page.height});
            } else {
                console.error('Background image not found');
            }


            doc.fontSize(16).font(font400);

            doc.text(nowTime, xCoordForNowTime, 52, {
                width: textBlockWidth,
                align: 'right'
            });

            doc.text('UTC CONFIRMED', xCoordForNowTime, 73, {
                width: textBlockWidth,
                align: 'right'
            });


            text = 'The license data, provenance, and associated cryptographic functions are timestamped on the Blokchain.'
            doc.fontSize(26);
            doc.font(font400).text(text, 57, 1060, {
                width: 447,
                align: 'left'
            });


            text = 'Licensing period:'
            doc.fontSize(26);
            doc.font(font400).text(text, 57, 1338, {
                width: 447,
                align: 'left'
            });

            doc.fillOpacity(0.5);
            text = 'License start date'
            doc.fontSize(14);
            doc.font(font400).text(text, 57, 1398, {
                width: 220,
                align: 'left'
            });


            text = 'License end date (incl.)'
            doc.fontSize(14);
            doc.font(font400).text(text, 230, 1398, {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fontSize(14);
            doc.font(font400).text(body.licence_from, 57, 1421, {
                width: 220,
                align: 'left'
            });


            doc.fontSize(14);
            doc.font(font400).text(body.licence_to, 230, 1421, {
                width: 220,
                align: 'left'
            });


            text = 'License Certificate'
            doc.fontSize(84);
            doc.font(font400).text(text, 384, 142, {
                width: 550,
                align: 'left'
            });


            doc.image(imageFile.path, 48, 142, {
                fit: [312, 312],
                align: 'center',
                valign: 'center'
            });


            text = body.licence_type
            doc.fontSize(18);
            doc.fillColor('blue')
            doc.font(font400).text(text, 392, 350, {
                width: 550,
                align: 'left'
            });
            doc.fillColor('black')


            if (body.copyrights.includes('adaption')) {
                doc.fontSize(16).text('Adaptation to the format/size required for digital placement\n' +
                    'on the platform/web resource/mobile application.', 48, 510, {width: 290})
            }

            if (body.copyrights.includes('storage')) {
                doc.fontSize(16).text('Storage of digital information, a file in a cloud data storage.', 384, 510, {width: 290})
            }

            if (body.copyrights.includes('placement')) {
                doc.fontSize(16).text('Placement and publication\n' +
                    ' on the platform/web resource/mobile application.', 720, 510, {width: 290})
            }
            if (body.copyrights.includes('publication')) {
                doc.fontSize(16).text('Publication of a digital object\n' +
                    'on the Internet in the\n' +
                    'public domain.', 48, 666, {width: 250})
            }
            if (body.copyrights.includes('metadata')) {
                doc.fontSize(16).text('An entry in the metadata\n' +
                    'of the digital fingerprint\n' +
                    'of the file for authentication.', 384, 666, {width: 290})
            }
            if (body.copyrights.includes('demonstration')) {
                doc.fontSize(16).text('Digital display (demonstration) of an object in online or virtual galleries, AR/VR.', 720, 666, {width: 290})
            }
            if (body.copyrights.includes('advertising')) {
                doc.fontSize(16).text('Publications in printed and electronic catalogs, advertising for the subsequent sale\n' +
                    'of the digital artwork.', 48, 822, {width: 290})
            }
            if (body.copyrights.includes('personal_use')) {
                doc.fontSize(16).text('Use for personal purposes and further\n' +
                    'resale as NFT.', 384, 822, {width: 290})
            }


            yStartPos = 1076
            yOffset = 80

            text = 'Link to the full agreement'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 0), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


        // Asset Name Text
        let assetNameText = 'Link'; // replace with body.assetName in your code
        doc.fillOpacity(1);
        doc.fontSize(14);
        doc.fillColor('blue'); // making the text blue to resemble a link
        doc.font(font400).text(assetNameText, 555, yStartPos + 20, {
            width: 430,
            align: 'left'
        });
        doc.fillOpacity(1);

        // Adding the hyperlink
        textWidth = doc.widthOfString(assetNameText);
        let textHeight = doc.currentLineHeight();

        doc.link(555, yStartPos + 20, textWidth, textHeight, body.link);



        text = 'Genre'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 1), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.genre, 555, yStartPos + (yOffset * 1) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Dimensions'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 2), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.dimensions, 555, yStartPos + (yOffset * 2) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);

            text = 'Format'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 3), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.format, 555, yStartPos + (yOffset * 3) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);

            text = 'Asset description'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 4), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.description, 555, yStartPos + (yOffset * 4) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);
            doc.end();

            stream.on('finish', () => {
                resolve(doc);
            });

            stream.on('error', (err) => {
                reject(err);
            });

        }
    )
}

function buildTokenCertificateFile(req, certFileName) {
    return new Promise(async (resolve, reject) => {

            const nowTime = getCurrentUTCDateTime();

            const body = req.body

            const files = req.files;
            if (!files || !files.preview_image || files.preview_image.length === 0) {
                reject('No preview image uploaded.')
            }
            const imageFile = files.preview_image[0];
            //
            const filePath = path.join(__dirname, 'certificates', certFileName);
            fs.mkdirSync(path.dirname(filePath), {recursive: true});
            //
            //     // PAGE 1
            const doc = new PDFDocument({size: [1080, 1528], margin: 0});

            const font400 = path.join(__dirname, 'font/stolzl_400.otf'); // Replace with path to your bold font file
            const font500 = path.join(__dirname, 'font/stolzl_500.otf'); // Replace with path to your bold font file


            const backgroundPath = path.join(__dirname, 'img/token_background_1.png');
            if (fs.existsSync(backgroundPath)) {
                doc.image(backgroundPath, 0, 0, {width: doc.page.width, height: doc.page.height});
            } else {
                console.error('Background image not found');
            }
            //


            const pageWidth = 1080; // Standard A4 page width in points
            const rightPaddingInPixels = 48;
            doc.fontSize(16).font(font400);
            const textBlockWidth = 200;
            const xCoordForNowTime = pageWidth - textBlockWidth - rightPaddingInPixels;

            doc.fillColor('blue')
            doc.text(nowTime, xCoordForNowTime, 52, {
                width: textBlockWidth,
                align: 'right'
            });

            doc.text('UTC CONFIRMED', xCoordForNowTime, 73, {
                width: textBlockWidth,
                align: 'right'
            });
            doc.fillColor('black')

            doc.image(imageFile.path, 290, 50, {
                fit: [462, 462],
                align: 'center',
                valign: 'center'
            });


            doc.fontSize(120);
            var text = 'CERTIFICATE';
            var textWidth = doc.widthOfString(text);
            var docCenter = doc.page.width / 2;
            var textStart = docCenter - (textWidth / 2);
            doc.font(font400).text(text, textStart, 620);

            doc.fontSize(18);

            text = 'of the digital asset’s authenticity ';
            textWidth = doc.widthOfString(text);
            docCenter = doc.page.width / 2;
            textStart = docCenter - (textWidth / 2);
            doc.font(font400).text(text, textStart, 760);


            text = 'The certificate, provenance data, and associated cryptographic functions are timestampes on the Blokchain'
            doc.fontSize(26);
            doc.font(font400).text(text, 57, 920, {
                width: 447,
                align: 'left'
            });


            //
            //
            //
            var yStartPos = 890
            var yOffset = 50
            //
            text = 'Initial IP Owner'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 0), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.owner, 555, yStartPos + (yOffset * 0) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Creators / IP owners'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 1), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            console.log(body.artists)


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.artists, 555, yStartPos + (yOffset * 1) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Digital asset'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 2), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);


            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.creativeAsset, 555, yStartPos + (yOffset * 2) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Creation Date'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 3), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.creationDate, 555, yStartPos + (yOffset * 3) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);
            //
            //
            text = 'Edition / Quantity'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 4), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.edition + ' / ' + body.quantity, 555, yStartPos + (yOffset * 4) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);
            //
            //
            text = 'Contract'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 5), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.contract, 555, yStartPos + (yOffset * 5) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);
            //
            //
            text = 'Token ID'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 6), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.tokenId, 555, yStartPos + (yOffset * 6) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Type'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 7), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.type, 555, yStartPos + (yOffset * 7) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);


            text = 'Format'
            doc.fillOpacity(0.5);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(text, 555, yStartPos + (yOffset * 8), {
                width: 220,
                align: 'left'
            });
            doc.fillOpacity(1);

            doc.fillOpacity(1);
            doc.fontSize(14);
            doc.fillColor('black')
            doc.font(font400).text(body.format, 555, yStartPos + (yOffset * 8) + 20, {
                width: 430,
                align: 'left'
            });
            doc.fillOpacity(1);

            //
            //
            //PAGE 2
            doc.addPage({size: [1080, 1528]});
            //
            //
            const backgroundPath2 = path.join(__dirname, 'img/token_background_2.png');
            //
            if (fs.existsSync(backgroundPath2)) {
                doc.image(backgroundPath2, 0, 0, {width: doc.page.width, height: doc.page.height});
            } else {
                console.error('Background image not found');
            }
            //
            //
            doc.fontSize(16).font(font400);
            doc.fillColor('blue')
            doc.text(nowTime, xCoordForNowTime, 52, {
                width: textBlockWidth,
                align: 'right'
            });

            doc.text('UTC CONFIRMED', xCoordForNowTime, 73, {
                width: textBlockWidth,
                align: 'right'
            });
            doc.fillColor('black')
            //
            //
            //
            //
            doc.fontSize(64).font(font500);
            text = 'Associated rights to the digital asset'
            doc.font(font400).text(text, 60, 173, {
                width: 700,
                align: 'left'
            });
            doc.fontSize(16).font(font400);

            if (body.copyrights.includes('adaption')) {
                doc.fontSize(16).text('Adaptation to the format/size required for digital placement\n' +
                    'on the platform/web resource/mobile application.', 48, 510, {width: 290})
            }

            if (body.copyrights.includes('storage')) {
                doc.fontSize(16).text('Storage of digital information, a file in a cloud data storage.', 384, 510, {width: 290})
            }

            if (body.copyrights.includes('placement')) {
                doc.fontSize(16).text('Placement and publication\n' +
                    ' on the platform/web resource/mobile application.', 720, 510, {width: 290})
            }
            if (body.copyrights.includes('publication')) {
                doc.fontSize(16).text('Publication of a digital object\n' +
                    'on the Internet in the\n' +
                    'public domain.', 48, 666, {width: 250})
            }
            if (body.copyrights.includes('metadata')) {
                doc.fontSize(16).text('An entry in the metadata\n' +
                    'of the digital fingerprint\n' +
                    'of the file for authentication.', 384, 666, {width: 290})
            }
            if (body.copyrights.includes('demonstration')) {
                doc.fontSize(16).text('Digital display (demonstration) of an object in online or virtual galleries, AR/VR.', 720, 666, {width: 290})
            }
            if (body.copyrights.includes('advertising')) {
                doc.fontSize(16).text('Publications in printed and electronic catalogs, advertising for the subsequent sale\n' +
                    'of the digital artwork.', 48, 822, {width: 290})
            }
            if (body.copyrights.includes('personal_use')) {
                doc.fontSize(16).text('Use for personal purposes and further\n' +
                    'resale as NFT.', 384, 822, {width: 290})
            }

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        doc.end();

        stream.on('finish', () => {
            resolve(doc);
        });

        stream.on('error', (err) => {
            reject(err);
        });

        }
    )
}