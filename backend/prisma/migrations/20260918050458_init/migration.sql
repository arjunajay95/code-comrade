-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "clerkId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "karma" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technology" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "githubOwner" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "submissionId" INTEGER NOT NULL,

    CONSTRAINT "Criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "feedback" TEXT NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionRating" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "criterionId" INTEGER NOT NULL,

    CONSTRAINT "CriterionRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoSnapshot" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "primaryLanguage" TEXT,
    "lastPushedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TechnologyToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TechnologyToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SubmissionToTechnology" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SubmissionToTechnology_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Technology_name_key" ON "Technology"("name");

-- CreateIndex
CREATE INDEX "Submission_createdAt_id_idx" ON "Submission"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Submission_authorId_idx" ON "Submission"("authorId");

-- CreateIndex
CREATE INDEX "Criterion_submissionId_idx" ON "Criterion"("submissionId");

-- CreateIndex
CREATE INDEX "Review_submissionId_idx" ON "Review"("submissionId");

-- CreateIndex
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_reviewerId_submissionId_key" ON "Review"("reviewerId", "submissionId");

-- CreateIndex
CREATE INDEX "CriterionRating_criterionId_idx" ON "CriterionRating"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "CriterionRating_reviewId_criterionId_key" ON "CriterionRating"("reviewId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "RepoSnapshot_submissionId_key" ON "RepoSnapshot"("submissionId");

-- CreateIndex
CREATE INDEX "RepoSnapshot_fetchedAt_idx" ON "RepoSnapshot"("fetchedAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_userId_endpoint_key_key" ON "IdempotencyKey"("userId", "endpoint", "key");

-- CreateIndex
CREATE INDEX "_TechnologyToUser_B_index" ON "_TechnologyToUser"("B");

-- CreateIndex
CREATE INDEX "_SubmissionToTechnology_B_index" ON "_SubmissionToTechnology"("B");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterion" ADD CONSTRAINT "Criterion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionRating" ADD CONSTRAINT "CriterionRating_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionRating" ADD CONSTRAINT "CriterionRating_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoSnapshot" ADD CONSTRAINT "RepoSnapshot_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TechnologyToUser" ADD CONSTRAINT "_TechnologyToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Technology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TechnologyToUser" ADD CONSTRAINT "_TechnologyToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionToTechnology" ADD CONSTRAINT "_SubmissionToTechnology_A_fkey" FOREIGN KEY ("A") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionToTechnology" ADD CONSTRAINT "_SubmissionToTechnology_B_fkey" FOREIGN KEY ("B") REFERENCES "Technology"("id") ON DELETE CASCADE ON UPDATE CASCADE;
