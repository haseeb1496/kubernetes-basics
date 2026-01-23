## Log Output App

A simple application that outputs timestamps and random strings to logs.

### Prerequisites

- Node.js (v18+)
- Docker
- kubectl configured with a Kubernetes cluster (k3d recommended)

### Run Locally

```bash
cd log-output
npm install
npm start
```

### Build Docker Image

```bash
docker build -t <your-dockerhub>/log-output:latest .
docker push <your-dockerhub>/log-output:latest
```

### Deploy to Kubernetes

```bash
# Deploy all manifests (deployment, service, configmap)
kubectl apply -f manifests/

# Check pods
kubectl get pods

# View logs
kubectl logs -f deployment/log-output-dep
```

### Access the App

```bash
# Port forward to access locally
kubectl port-forward svc/log-output-svc 8080:80

# Open http://localhost:8080
```
