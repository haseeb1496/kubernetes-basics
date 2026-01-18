# DummySite Kubernetes Controller

A Kubernetes controller that creates a copy of any website and serves it within your cluster using the DummySite Custom Resource.

## Overview

The DummySite controller watches for DummySite custom resources and automatically:

1. Fetches HTML content from the specified website URL
2. Creates a ConfigMap containing the website content
3. Deploys an nginx pod to serve the content
4. Exposes the content through a Kubernetes Service

## Quick Start

1. **Apply the Custom Resource Definition:**

   ```bash
   kubectl apply -f dummysite-crd.yaml
   ```

2. **Apply RBAC resources:**

   ```bash
   kubectl apply -f rbac.yaml
   ```

3. **Deploy the controller:**

   ```bash
   # Build and import the image (for k3d)
   docker build -t dummysite-controller:latest .
   k3d image import dummysite-controller:latest --cluster mycluster

   # Deploy the controller
   kubectl apply -f deployment.yaml
   ```

4. **Create a DummySite:**
   ```bash
   kubectl apply -f example-dummysite.yaml
   ```

## Usage Examples

### Basic Example (example.com)

```yaml
apiVersion: example.com/v1
kind: DummySite
metadata:
  name: example-site
  namespace: default
spec:
  website_url: "https://example.com"
```

### Wikipedia Example

```yaml
apiVersion: example.com/v1
kind: DummySite
metadata:
  name: kubernetes-wiki
  namespace: default
spec:
  website_url: "https://en.wikipedia.org/wiki/Kubernetes"
```

## What Gets Created

When you create a DummySite resource, the controller automatically creates:

- **ConfigMap** (`<name>-content`): Contains the fetched HTML content
- **Deployment** (`<name>-deployment`): nginx pod serving the content
- **Service** (`<name>-service`): ClusterIP service exposing the deployment

## Testing

After creating a DummySite, you can access the copied website:

```bash
# Port forward to access the service
kubectl port-forward service/example-site-service 8080:80

# Access the copied website
curl http://localhost:8080
```

## Features

- **Automatic Content Fetching**: Downloads HTML content from any accessible URL
- **Nginx Serving**: Uses lightweight nginx alpine image to serve content
- **Resource Management**: Automatically creates and manages all required Kubernetes resources
- **Status Updates**: Updates DummySite status with current phase and messages
- **Error Handling**: Graceful error handling with meaningful status updates

## Limitations

- **CSS/JS/Images**: Only fetches the main HTML content, external resources may not work
- **Content Size**: Limited to 5MB content size for performance
- **Static Content Only**: Creates a static copy, no dynamic functionality
- **Security**: Fetches content without authentication, suitable for public sites

## Status Phases

- `Pending`: DummySite created but not yet processed
- `Processing`: Controller is fetching content and creating resources
- `Ready`: All resources created successfully, website copy available
- `Failed`: Error occurred during processing

## Troubleshooting

### Check Controller Logs

```bash
kubectl logs -l app=dummysite-controller
```

### Check Created Resources

```bash
kubectl get configmaps,deployments,services | grep <dummysite-name>
```

### Check DummySite Status

```bash
kubectl describe dummysite <name>
```

## Architecture

The controller is built using:

- **Node.js** with `@kubernetes/client-node` for Kubernetes API interaction
- **Axios** for HTTP requests to fetch website content
- **Watch API** for real-time DummySite resource monitoring
- **Custom Resource Definitions** for extending Kubernetes API

## License

MIT
