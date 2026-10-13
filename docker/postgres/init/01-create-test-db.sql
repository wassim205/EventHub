-- Database used by the Jest/Supertest suite, kept separate from the dev database
-- so a test run can never wipe data you are working on.
CREATE DATABASE eventhub_test OWNER eventhub;