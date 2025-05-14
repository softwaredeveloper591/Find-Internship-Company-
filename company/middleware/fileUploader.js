// fileUploader.js or imageUploader.js
const multer = require('multer');
const path = require('path');

// Store file in memory for DB storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	const allowedTypes = /pdf|docx/;
	const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
	const mimetype = allowedTypes.test(file.mimetype);

	if (extname && mimetype) {
		cb(null, true);
	} else {
		cb(new Error('Invalid file type'));
	}
};

const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: { fileSize: 7 * 1024 * 1024 }
});

module.exports = upload;
