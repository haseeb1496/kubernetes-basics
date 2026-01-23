## Port Forwarding App

A simple web server demonstrating Kubernetes port forwarding and ingress.

### Prerequisites

- Node.js (v18+)
- Docker
- kubectl configured with a Kubernetes cluster (k3d recommended)

### Run Locally

```bash
cd port-forwarding-app
npm install
npm start
```

App runs on http://localhost:3000

### Build Docker Image

```bash
docker build -t <your-dockerhub>/port-forwarding-app:latest .
docker push <your-dockerhub>/port-forwarding-app:latest
```

### Deploy to Kubernetes

```bash
# Deploy all manifests
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/ingress.yaml

# Check pods
kubectl get pods
```

### Access the App

```bash
# Option 1: Port forward
kubectl port-forward svc/port-forwarding-svc 8080:80
# Open http://localhost:8080

# Option 2: Via Ingress (if configured)
# Access via the ingress host defined in ingress.yaml
```
