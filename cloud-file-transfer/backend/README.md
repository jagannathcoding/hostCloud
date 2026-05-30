# Cloud File Transfer System

This is a simple full-stack project where a user can upload a file from a React frontend, store it in Google Cloud Storage, see uploaded files, download files using a temporary signed URL, and delete files from the cloud.

## What This Project Does

- Uploads a single file from the frontend
- Sends the file to the backend
- Stores the file in Google Cloud Storage
- Shows uploaded files in the UI
- Downloads files using a signed URL
- Deletes files from Google Cloud Storage
- Stores file details in an in-memory array only

## Technologies Used

### Frontend

- Vite
- React.js
- Tailwind CSS
- JavaScript

### Backend

- Node.js
- Express.js
- Multer
- CORS
- dotenv
- Google Cloud Storage using `@google-cloud/storage`

## Full Folder Structure

```text
cloud-file-transfer/
|
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md
│   └── service-account.json
|
└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── postcss.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── App.css
        └── api.js
```

## How To Create Google Cloud Storage Bucket

1. Open Google Cloud Console.
2. Create a new project or choose an existing project.
3. In the search bar, search for `Cloud Storage`.
4. Open `Buckets`.
5. Click `Create`.
6. Enter a unique bucket name.
7. Choose a region.
8. Keep the default options if you are a beginner.
9. Click `Create`.

## How To Create Google Cloud Service Account

1. In Google Cloud Console, search for `IAM & Admin`.
2. Open `Service Accounts`.
3. Click `Create Service Account`.
4. Enter a service account name.
5. Click `Create and Continue`.
6. Give the role `Storage Admin` for testing this project.
7. Click `Done`.

## How To Download JSON Key

1. Open the created service account.
2. Go to the `Keys` tab.
3. Click `Add Key`.
4. Choose `Create new key`.
5. Select `JSON`.
6. Click `Create`.
7. A JSON file will be downloaded.

## Rename JSON Key

Rename the downloaded JSON file to:

```text
service-account.json
```

## Put JSON File Inside Backend Folder

Place the file here:

```text
cloud-file-transfer/backend/service-account.json
```

## How To Create `.env` From `.env.example`

1. Go to the `backend` folder.
2. Create a new file named `.env`.
3. Copy everything from `.env.example`.
4. Replace the bucket name with your real bucket name.

Example:

```env
PORT=5000
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

## `.env` Variables Explanation

- `PORT=5000`
  Runs the backend server on port 5000.
- `GCS_BUCKET_NAME=your-bucket-name`
  Your Google Cloud Storage bucket name.
- `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json`
  Path to your Google Cloud service account JSON file.

## How To Install Backend

```bash
cd backend
npm install
```

## How To Run Backend

```bash
npm start
```

Backend will run on:

```text
http://localhost:5000
```

## How To Install Frontend

```bash
cd frontend
npm install
```

## How To Run Frontend

```bash
npm run dev
```

Frontend will run on:

```text
http://localhost:5173
```

## API Route Explanation

### `GET /`

Checks whether the backend is running.

Response:

```text
Cloud File Transfer Backend Running
```

### `POST /api/upload`

- Uploads one file
- Form field name must be `file`
- Uses `multer.memoryStorage()`
- Uploads file to Google Cloud Storage
- Saves file details in the in-memory `uploadedFiles` array

### `GET /api/files`

Returns all uploaded file details stored in memory.

### `GET /api/download/:fileName`

Generates a signed URL that is valid for 15 minutes and returns it.

### `DELETE /api/delete/:fileName`

Deletes the file from Google Cloud Storage and removes it from the in-memory array.

## Important Security Note

- Do not upload `.env` to GitHub
- Do not upload `service-account.json` to GitHub

## Viva Explanation In Simple Words

This project works like a bridge between the user and Google Cloud Storage.

- The frontend is used to choose and upload files.
- The backend receives the file using Multer in memory.
- The backend sends that file to Google Cloud Storage.
- File details are stored temporarily in an array.
- When the user clicks download, the backend creates a signed URL.
- When the user clicks delete, the backend removes the file from cloud storage.

## Project Flow Diagram In Text

```text
User
  |
  v
React Frontend
  |
  v
Express Backend + Multer memoryStorage
  |
  v
Google Cloud Storage Bucket
  |
  +--> Download with signed URL
  |
  +--> Delete file from bucket
```
