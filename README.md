# Discussion Platform

A full-stack discussion platform inspired by modern forum systems such as Reddit. The application allows users to create posts, upload images, participate in threaded discussions, vote on content, browse topic-based channels, and perform administrative moderation.

## Project Overview

The goal of this project is to demonstrate a complete web application integrating:

* Frontend development
* Backend API design
* Relational database management
* Authentication and authorization
* File uploads and storage
* Containerized deployment

---

## System Architecture

The application follows a standard three-tier architecture.

### Frontend

* React
* Dynamic UI rendering
* State management
* Responsive user experience

### Backend

* Node.js
* Express.js
* RESTful API endpoints
* Authentication and business logic

### Database

* MySQL
* Structured relational data storage
* Persistent user, content, and interaction data

### Deployment

* Docker
* Docker Compose
* Reproducible multi-container environment

---

## Key Features

### User Features

* User authentication and session management
* Create posts with optional image uploads
* Edit posts (author only)
* Create threaded discussions with nested replies
* Upvote and downvote posts and replies
* Search and filter content
* Browse channel-based communities

### Administrative Features

* Delete users
* Delete posts
* Delete replies
* Delete channels
* Moderate platform content

### Data Persistence

* Persistent MySQL database storage
* Persistent uploaded image storage
* Docker volume support

---

## Database Design

The system uses six primary tables:

| Table       | Purpose                                  |
| ----------- | ---------------------------------------- |
| users       | User accounts, authentication, and roles |
| channels    | Topic-based content organization         |
| posts       | Main discussion content                  |
| replies     | Nested discussion threads                |
| votes       | User voting records                      |
| attachments | Uploaded image metadata                  |

### Relationships

* One user can create many posts
* One channel contains many posts
* One post can have many replies
* Replies support hierarchical nesting
* Users can vote on posts and replies
* Posts can contain uploaded image attachments

The complete schema is documented in:

```text
backend/schema.sql
```

Tables are also automatically initialized during backend startup.

---

## Technology Stack

### Frontend

* React

### Backend

* Node.js
* Express.js

### Database

* MySQL

### Infrastructure

* Docker
* Docker Compose

### Additional Libraries

* Multer (image uploads)

### Why These Technologies?

* React provides fast and efficient UI updates.
* Express offers a lightweight and flexible API layer.
* MySQL provides reliable relational data management.
* Docker ensures consistent execution across environments.
* Multer simplifies image upload handling.

---

## Reproducibility & Data Generation

The project includes a seeding system that automatically generates realistic sample data.

Generated content includes:

* ~30 users
* ~15 channels
* ~250 posts
* Hundreds of replies
* Nested reply chains
* Randomized voting activity
* Channel-themed images

This enables rapid testing and demonstration of all platform features.

---

# Setup Instructions

## Prerequisites

Install:

* Docker
* Docker Compose

---

## Start the Application

```bash
docker compose up --build
```

This command starts:

* MySQL Database
* Backend Server
* Frontend Application

---

## Seed the Database (Recommended)

```bash
docker compose exec backend npm run reseed
```

This command will:

* Clear existing data
* Remove uploaded images
* Generate fresh users, channels, posts, replies, votes, and images

---

## Access the Application

Open your browser:

```text
http://localhost
```

---

## Environment Variables

A sample configuration file is provided:

```text
.env.example
```

Docker Compose automatically supplies required environment variables including:

* Database host
* Database username
* Database password
* Database name
* Backend port
* Session secret
* Frontend API URL

---

## Database Schema

The database schema is located at:

```text
backend/schema.sql
```

The backend automatically creates missing tables during startup.

---

## Available Features

* Create posts with image uploads
* Reply to posts
* Nested discussion threads
* Persistent voting system
* Channel browsing and filtering
* Content search
* Author-only post editing
* Administrative moderation tools

---

## Resetting the Application

### Reseed Data

```bash
docker compose exec backend npm run reseed
```

### Complete Reset

Remove all data and rebuild:

```bash
docker compose down -v
docker compose up --build
```

---

## Notes

* Uploaded images are stored locally in:

```text
backend/uploads
```

* Database data is persisted through Docker volumes.
* The application is designed for easy reproduction, testing, and grading.
* All services can be launched with a single Docker Compose command.

---

## Authors

Developed as part of a full-stack software engineering project demonstrating modern web development, database design, and containerized deployment practices.
