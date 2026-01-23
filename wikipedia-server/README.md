# Wikipedia Server

A Kubernetes application that serves Wikipedia pages using a multi-container pod pattern.

## Architecture

This app demonstrates Kubernetes multi-container patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                          Pod                                 │
│  ┌─────────────────┐                                        │
│  │  Init Container │ ──► Fetches /wiki/Kubernetes           │
│  │  (curl)         │     on startup                         │
│  └────────┬────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Shared Volume (emptyDir)                │    │
│  │                    /www/index.html                   │    │
│  └─────────────────────────────────────────────────────┘    │
│           ▲                           ▲                      │
│           │                           │                      │
│  ┌────────┴────────┐         ┌────────┴────────┐            │
│  │  Main Container │         │ Sidecar Container│            │
│  │  (nginx)        │         │ (wiki-fetcher)   │            │
│  │  Serves content │         │ Fetches random   │            │
│  │  on port 80     │         │ pages every      │            │
│  │                 │         │ 5-15 minutes     │            │
│  └─────────────────┘         └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Containers

### 1. Init Container (`init-fetch-kubernetes`)

- **Image**: `curlimages/curl:latest`
- **Purpose**: Fetches the Kubernetes Wikipedia page on pod startup
- **Runs once**: Before main containers start

### 2. Main Container (`nginx`)

- **Image**: `nginx:alpine`
- **Purpose**: Serves the Wikipedia content via HTTP
- **Port**: 80

### 3. Sidecar Container (`wiki-fetcher`)

- **Image**: `curlimages/curl:latest`
- **Purpose**: Periodically fetches random Wikipedia pages
- **Interval**: Random 5-15 minutes

## Deployment

```bash
# Deploy the application
kubectl apply -f manifests/

# Check pod status
kubectl get pods -l app=wikipedia-server

# View logs from each container
kubectl logs -l app=wikipedia-server -c init-fetch-kubernetes
kubectl logs -l app=wikipedia-server -c nginx
kubectl logs -l app=wikipedia-server -c wiki-fetcher

# Port-forward to access the app
kubectl port-forward svc/wikipedia-server 8080:80

# Open in browser
open http://localhost:8080
```

## Testing

```bash
# Access the served Wikipedia page
curl http://localhost:8080

# Watch the sidecar logs for page updates
kubectl logs -f -l app=wikipedia-server -c wiki-fetcher
```

## How It Works

1. **Startup**: The init container downloads the Kubernetes Wikipedia page to `/www/index.html`
2. **Serving**: nginx serves the content from the shared volume
3. **Updates**: The sidecar waits 5-15 minutes, then fetches a random Wikipedia page, overwriting the current content
4. **Repeat**: The sidecar continues this loop indefinitely

## Shared Volume

All containers share an `emptyDir` volume:

- Init container writes to `/www`
- nginx reads from `/usr/share/nginx/html` (mounted to the same volume)
- Sidecar writes to `/www`
