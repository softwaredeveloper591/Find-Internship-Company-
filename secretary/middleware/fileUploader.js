// fileUploader.js or imageUploader.js
const multer = require('multer');
const path = require('path');

// Store file in memory for DB storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	const allowedExtensions = ['.pdf', '.docx'];
	const allowedMimeTypes = [
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	];

	const ext = path.extname(file.originalname).toLowerCase();
	const mimetype = file.mimetype;

	if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
	}
};

const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: { fileSize: 15 * 1024 * 1024 }
});

module.exports = upload;
