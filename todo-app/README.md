## Todo app

Deploy with `kubectl apply -f manifests/deployment.yaml`

---

## Solution Comparison: Pros & Cons

### Kubernetes Distributions

#### k3d/k3s (Local Development)

**Pros:**

- Free to use
- Quick setup (~1 minute)
- Low resource consumption
- No cloud account required
- Great for learning and development

**Cons:**

- Not production-ready
- Limited scalability
- No built-in HA (high availability)
- No managed backups
- Data lost when cluster deleted

#### Google Kubernetes Engine (GKE)

**Pros:**

- Production-ready
- Managed control plane
- Auto-scaling
- Integrated monitoring/logging
- Automated backups available
- High availability

**Cons:**

- Costs money (~$70+/month for basic cluster)
- Requires GCP account setup
- More complex IAM configuration
- Vendor lock-in concerns

---

### GitOps Solutions

#### ArgoCD

**Pros:**

- Rich web UI for visualization
- Multi-cluster support
- RBAC built-in
- Large community
- Supports Helm, Kustomize, plain YAML

**Cons:**

- Resource-heavy (~500MB+ RAM)
- Learning curve for advanced features
- Sync can be slow for large repos

#### Flux

**Pros:**

- Lightweight
- GitOps Toolkit (modular)
- Better Helm integration
- Multi-tenancy support

**Cons:**

- No built-in UI (need Weave GitOps)
- Steeper CLI learning curve
- Smaller community than ArgoCD

---

### Service Mesh

#### Istio (Ambient Mode)

**Pros:**

- Feature-rich (traffic management, security, observability)
- No sidecar overhead in ambient mode
- Large community and documentation
- Kiali for visualization

**Cons:**

- Complex to configure
- High resource usage
- Steep learning curve
- Can add latency

#### Linkerd

**Pros:**

- Simpler than Istio
- Lower resource footprint
- Easier to install
- Rust-based proxy (fast)

**Cons:**

- Fewer features than Istio
- Smaller ecosystem
- Less traffic management options

---

### Serverless Platforms

#### Knative Serving

**Pros:**

- Scale to zero
- Auto-scaling built-in
- Revision management
- Vendor-neutral

**Cons:**

- Complex setup
- Requires networking layer (Kourier/Istio)
- Cold start latency
- Version compatibility issues with K8s

#### Google Cloud Run

**Pros:**

- Fully managed
- No cluster management
- Pay per request
- Simple deployment

**Cons:**

- Vendor lock-in
- Less control
- Costs can grow with traffic
- Limited customization

---

### Database Backup Strategies

#### PostgreSQL with PersistentVolumeClaim

**Pros:**

- Simple setup
- Data persists across pod restarts

**Cons:**

- Manual backup required
- No point-in-time recovery
- Storage tied to cluster

#### Cloud-Managed Database (Cloud SQL)

**Pros:**

- Automated backups
- Point-in-time recovery
- High availability options
- Managed maintenance

**Cons:**

- Additional cost
- Network latency to cluster
- Vendor dependency
