# Cloud File Transfer Backend (Cloudinary)

This backend accepts file uploads from the frontend, stores files in Cloudinary, lists uploaded files (in-memory), returns download URLs, and deletes files from Cloudinary.

## Tech

- Node.js
- Express
- Multer
- Cloudinary
- dotenv
- cors

## Setup

1. Go to backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example` and fill values:

```env
PORT=5000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=cloud-file-transfer
```

Get these values from Cloudinary Dashboard.

## Run

```bash
npm start
```

Backend runs at `http://localhost:5000`.

## API

- `GET /` health check
- `POST /api/upload` upload single file using form field `file`
- `GET /api/files` list uploaded file metadata (in-memory)
- `GET /api/download/:fileName` returns file download URL
- `DELETE /api/delete/:fileName` deletes file from Cloudinary

## Notes

- Uploaded file metadata is stored in-memory, so restart clears list.
- Max upload size is 10 MB.
