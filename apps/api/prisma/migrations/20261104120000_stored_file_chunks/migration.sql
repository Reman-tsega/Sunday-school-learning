-- Existing rows keep their single "data" value; new files are stored in chunks
ALTER TABLE "stored_files" ALTER COLUMN "data" DROP NOT NULL;

-- CreateTable
CREATE TABLE "stored_file_chunks" (
    "fileId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "stored_file_chunks_pkey" PRIMARY KEY ("fileId","index")
);

-- AddForeignKey
ALTER TABLE "stored_file_chunks" ADD CONSTRAINT "stored_file_chunks_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
