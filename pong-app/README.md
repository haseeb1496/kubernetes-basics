## Pong App

A ping-pong counter application with PostgreSQL persistence. Supports both traditional Kubernetes deployment and Knative serverless deployment.

### Run Locally

```bash
cd pong-app
npm install

export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=pingpongdb
export POSTGRES_USER=pingponguser
export POSTGRES_PASSWORD=pingpongpassword

npm start
```

App runs on http://localhost:8080

### Build Docker Image

```bash
docker build -t <your-dockerhub>/pong-app:latest .
docker push <your-dockerhub>/pong-app:latest
```

### Deploy to Kubernetes (Traditional)

```bash
# Deploy PostgreSQL first
kubectl apply -f manifests/postgres-secret.yaml
kubectl apply -f manifests/postgres-configmap.yaml
kubectl apply -f manifests/postgres-statefulset.yaml
kubectl apply -f manifests/postgres-service.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres --timeout=60s

# Deploy the app
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/ingress.yaml

# Check pods
kubectl get pods
```

### Deploy to Knative (Serverless)

```bash
# Ensure Knative Serving is installed

# Deploy PostgreSQL
kubectl apply -f manifests/postgres.yaml

# Deploy Knative Service
kubectl apply -f manifests/knative-service.yaml

# Get the URL
kubectl get ksvc pong-app
```

### Access the App

```bash
# Traditional deployment - Port forward
kubectl port-forward svc/pong-svc 8080:80

# Or via Ingress
# Access http://localhost:8081/pingpong (k3d with port mapping)
```

### Endpoints

- `GET /pingpong` - Increments counter and returns "pong X"
- `GET /count` - Returns current counter value

### Canary Deployment (with Argo Rollouts)

```bash
# Deploy Argo Rollouts first
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Deploy canary setup
kubectl apply -f manifests/rollout.yaml
kubectl apply -f manifests/rollout-services.yaml
kubectl apply -f manifests/analysis-template.yaml
```
