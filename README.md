# OptiSlots: The Evolutionary Timetabling System

**OptiSlots** is a web-based timetabling system designed for complex organizations such as universities and large enterprises.  
It uses a high-performance **C++ evolutionary algorithm** to automatically generate optimal schedules based on multiple constraints and user preferences.



## Key Features

### Evolutionary Optimization
High-speed C++ genetic algorithm backend ensures efficient and scalable schedule computation.

### Preference-Based Scheduling
Users (students, teachers, employees) can define their availability and preferences  
(e.g. "prefer morning classes", "avoid gaps") through a simple web interface.

### Multi-Tenancy
Supports multiple organizations, each with isolated users, rooms, subjects, and constraints.

### Asynchronous Job Processing
Optimization tasks run as background jobs. The system remains responsive, and users can monitor progress in real time.

### Modern Tech Stack
Built with **React/Next.js**, **Django**, **C++**, **Redis**, and **Docker** for performance and modularity.


## System Architecture

EvoPlanner follows a **microservice-based architecture** with several main components:

### Frontend – `/frontend/evoplanner_frontend`
A **Next.js (React)** application providing the user interface:
- Users log in and manage their schedules.
- Submit preferences visually on a grid.
- View optimization progress and final timetables.

### Backend – `/backend`
A **Django** application serving as the central API and data hub:
- Manages users, organizations, subjects, rooms, and constraints.
- Handles optimization jobs and data flow between components.
- Sends progress updates to the frontend via WebSockets.

### Optimizer Service – `/optimizer_service`
A standalone **C++** service that implements the genetic algorithm:
- Listens for new jobs from Redis (`optimizer:jobs`).
- Runs the optimization process.
- Publishes progress updates (`optimizer:progress:updates`).
- Returns the final optimized schedule as a JSON object.

### Redis
Acts as the **message broker** between services, handling:
- Job queues.
- Real-time pub/sub updates.


## Optimization Workflow

1. **Job Submission**  
   An administrator triggers a job for a specific "Recruitment" (e.g., "Fall Semester 2025").

2. **Problem Definition**  
   The Django backend compiles all relevant data (preferences, constraints, capacities, etc.) into a JSON definition.

3. **Queue Dispatch**  
   The job is sent to the Redis queue (`optimizer:jobs`).

4. **Evolutionary Optimization**  
   The C++ optimizer dequeues the job, runs the algorithm, and continuously improves schedule quality.

5. **Progress Tracking**  
   The optimizer publishes live updates (iteration, fitness score) to a Redis channel.  
   A Django listener saves these updates and forwards them to the frontend.

6. **Completion**  
   When finished, the optimizer sends the best-found schedule to Django, which stores it and makes it visible in the frontend.


## Getting Started

### Prerequisites
- Docker and Docker Compose  
- Node.js (v18 or later) and npm  

---

### 1. Running the Application with Docker

Start the entire backend stack (Django API, C++ optimizer, background workers, and Redis) using:

```bash
docker compose up -d
```

Then, in another terminal, start the frontend:

```bash
cd frontend/evoplanner_frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000￼
- Backend: http://localhost:8000￼


### 2. Manual Backend Development (Without Docker)

Run each component manually in separate terminals.
A running Redis instance (local or via Docker) is required.

Terminal 1 – Django Core API:

```bash
cd backend
python manage.py migrate
python manage.py runserver
```

Terminal 2 – Scheduler:

```bash
cd backend
python manage.py run_scheduler --interval 30
```

Terminal 3 – Progress Listener:

```bash
cd backend
python manage.py listen_progress
```

Terminal 4 – C++ Optimizer Service:
(Compile with CMake before running)

```bash
cd optimizer_service/build
./optimizer_service
```


## Utility Scripts

### Full System Cleanup

**Warning:** This will stop and delete all Docker containers, images, volumes, and networks.  
Use with caution to ensure a clean rebuild.

```bash
# Stop all running containers
docker stop $(docker ps -q) 2>/dev/null || true

# Remove all containers
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Remove all images
docker rmi -f $(docker images -aq) 2>/dev/null || true

# Remove all volumes
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Prune networks, builder cache, and system
docker network prune -f
docker builder prune -af
docker system prune -a --volumes -f
```
