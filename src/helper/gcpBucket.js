const { Storage } = require('@google-cloud/storage');
const { GCP, FILE_MAX_SIZE } = require('../constants/constants');
const logger = require('../utils/logger');
const Multer = require('multer');
// Instantiate a storage client with credentials
const storage = new Storage({ keyFilename: GCP.GCP_SECRET_KEY });
const bucket = storage.bucket(GCP.GCS_BUCKET_NAME);

const multer = Multer({
	storage: Multer.MemoryStorage,
	limits: { fileSize: FILE_MAX_SIZE },
});

const getPublicUrl = (filename) => {
	return `${GCP.GCP_STORAGE_URL}/${GCP.GCS_BUCKET_NAME}/${filename}`;
};

const getAllFiles = async () => {
	const [files] = await bucket.getFiles();
	let fileInfos = [];

	files.forEach((file) => {
		fileInfos.push({
			name: file.name,
			url: file.metadata.mediaLink,
		});
	});
	return fileInfos;
};

const deleteFile = async (fileName) => {
	try {
		await bucket.file(fileName).delete();
		logger.info(`[deleteFile] Deleted file successfully: ${fileName}`);
		return true;
	} catch (error) {
		logger.debug('[deleteFile] Error deleting file.');
		return false;
	}
};

const sendUploadToGCS = (req, res, next) => {
	if (!req.file) {
		return next();
	}

	const gcsname = Date.now() + req.file.originalname;
	const file = bucket.file(gcsname);

	const stream = file.createWriteStream({
		metadata: {
			contentType: req.file.mimetype,
		},
	});

	stream.on('error', (err) => {
		req.file.cloudStorageError = err;
		next(err);
	});

	stream.on('finish', () => {
		req.file.cloudStorageObject = gcsname;
		file
			.makePublic()
			.then(() => {
				req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
				next();
			})
			.catch(() => {
				req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
				next();
			});
	});

	stream.end(req.file.buffer);
};

const sendUploadMultiToGCS = async (fileUploads) => {
	if (fileUploads.length === 0) {
		return [];
	}
	let promises = [];
	for (let file of fileUploads) {

		const gcsname = Date.now().toString() + file.originalname;

		const fileName = bucket.file(gcsname);

		const stream = fileName.createWriteStream({

			metadata: {
				contentType: file.mimetype,
			},
		});

		stream.on('error', (err) => {
			logger.error(`[sendUploadMultiImgToGCS]: 1 - error -> ${JSON.stringify(err)}`);
		});

		stream.end(file.buffer);

		promises.push(
			new Promise((resolve, reject) => {
				stream.on('finish', () => {
					file.cloudStorageObject = gcsname;
					fileName
						.makePublic()
						.then(() => {
							file.cloudStoragePublicUrl = getPublicUrl(gcsname);
							resolve(file.cloudStoragePublicUrl);
						})
						.catch((error) => {
							logger.error(`[sendUploadMultiImgToGCS]: 2 - error -> ${JSON.stringify(err)}`);
						});
				});
			})
		);
	}

	return await Promise.all(promises);
};

module.exports = {
	getPublicUrl,
	sendUploadToGCS,
	getAllFiles,
	deleteFile,
	multer,
	sendUploadMultiToGCS,
};
