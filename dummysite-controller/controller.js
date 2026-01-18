const k8s = require("@kubernetes/client-node");
const axios = require("axios");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
const networkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api);

const GROUP = "example.com";
const VERSION = "v1";
const PLURAL = "dummysites";

class DummySiteController {
  constructor() {
    this.processedResources = new Set();
  }

  async start() {
    console.log("Starting DummySite controller...");

    this.watchDummySites();

    console.log("DummySite controller started successfully");
  }

  async watchDummySites() {
    const watch = new k8s.Watch(kc);

    try {
      const req = await watch.watch(
        `/apis/${GROUP}/${VERSION}/${PLURAL}`,
        {},
        this.onEvent.bind(this),
        this.onError.bind(this)
      );
    } catch (error) {
      console.error("Error setting up watch:", error);
      setTimeout(() => this.watchDummySites(), 5000);
    }
  }

  async onEvent(type, obj) {
    const name = obj.metadata.name;
    const namespace = obj.metadata.namespace;
    const resourceVersion = obj.metadata.resourceVersion;

    console.log(
      `Event: ${type} for DummySite ${namespace}/${name} (rv: ${resourceVersion})`
    );

    const resourceKey = `${namespace}/${name}@${resourceVersion}`;

    if (type === "ADDED" || type === "MODIFIED") {
      if (this.processedResources.has(resourceKey)) {
        console.log(`Skipping already processed resource: ${resourceKey}`);
        return;
      }

      try {
        await this.reconcile(obj);
        this.processedResources.add(resourceKey);

        if (this.processedResources.size > 100) {
          const entries = Array.from(this.processedResources);
          entries.slice(0, entries.length - 100).forEach((key) => {
            this.processedResources.delete(key);
          });
        }
      } catch (error) {
        console.error(
          `Error reconciling DummySite ${namespace}/${name}:`,
          error
        );
        await this.updateStatus(namespace, name, "Failed", error.message);
      }
    }
  }

  onError(error) {
    console.error("Watch error:", error);
    setTimeout(() => this.watchDummySites(), 5000);
  }

  async reconcile(dummySite) {
    const namespace = dummySite.metadata.namespace;
    const name = dummySite.metadata.name;
    const websiteUrl = dummySite.spec.website_url;

    console.log(
      `Reconciling DummySite ${namespace}/${name} for URL: ${websiteUrl}`
    );

    await this.updateStatus(
      namespace,
      name,
      "Processing",
      "Fetching website content..."
    );

    try {
      const htmlContent = await this.fetchWebsiteContent(websiteUrl);

      await this.createConfigMap(namespace, name, htmlContent);

      await this.createDeployment(namespace, name);

      const serviceUrl = await this.createService(namespace, name);

      await this.updateStatus(
        namespace,
        name,
        "Ready",
        `Website copy available at: ${serviceUrl}`,
        serviceUrl
      );
    } catch (error) {
      throw error;
    }
  }

  async fetchWebsiteContent(url) {
    console.log(`Fetching content from: ${url}`);

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        maxContentLength: 5 * 1024 * 1024,
        headers: {
          "User-Agent": "DummySite-Controller/1.0",
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch website content: ${error.message}`);
    }
  }

  async createConfigMap(namespace, name, htmlContent) {
    const configMapName = `${name}-content`;

    const configMap = {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: configMapName,
        namespace: namespace,
        labels: {
          app: name,
          "managed-by": "dummysite-controller",
        },
      },
      data: {
        "index.html": htmlContent,
      },
    };

    try {
      await k8sApi.readNamespacedConfigMap(configMapName, namespace);
      await k8sApi.replaceNamespacedConfigMap(
        configMapName,
        namespace,
        configMap
      );
      console.log(`Updated ConfigMap: ${configMapName}`);
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        await k8sApi.createNamespacedConfigMap(namespace, configMap);
        console.log(`Created ConfigMap: ${configMapName}`);
      } else {
        throw error;
      }
    }
  }

  async createDeployment(namespace, name) {
    const deploymentName = `${name}-deployment`;
    const configMapName = `${name}-content`;

    const deployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: deploymentName,
        namespace: namespace,
        labels: {
          app: name,
          "managed-by": "dummysite-controller",
        },
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: name,
          },
        },
        template: {
          metadata: {
            labels: {
              app: name,
            },
          },
          spec: {
            containers: [
              {
                name: "nginx",
                image: "nginx:alpine",
                ports: [
                  {
                    containerPort: 80,
                  },
                ],
                volumeMounts: [
                  {
                    name: "html-content",
                    mountPath: "/usr/share/nginx/html",
                    readOnly: true,
                  },
                ],
              },
            ],
            volumes: [
              {
                name: "html-content",
                configMap: {
                  name: configMapName,
                },
              },
            ],
          },
        },
      },
    };

    try {
      await appsV1Api.readNamespacedDeployment(deploymentName, namespace);
      await appsV1Api.replaceNamespacedDeployment(
        deploymentName,
        namespace,
        deployment
      );
      console.log(`Updated Deployment: ${deploymentName}`);
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        await appsV1Api.createNamespacedDeployment(namespace, deployment);
        console.log(`Created Deployment: ${deploymentName}`);
      } else {
        throw error;
      }
    }
  }

  async createService(namespace, name) {
    const serviceName = `${name}-service`;

    const service = {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: serviceName,
        namespace: namespace,
        labels: {
          app: name,
          "managed-by": "dummysite-controller",
        },
      },
      spec: {
        selector: {
          app: name,
        },
        ports: [
          {
            port: 80,
            targetPort: 80,
            protocol: "TCP",
          },
        ],
        type: "ClusterIP",
      },
    };

    try {
      await k8sApi.readNamespacedService(serviceName, namespace);
      await k8sApi.replaceNamespacedService(serviceName, namespace, service);
      console.log(`Updated Service: ${serviceName}`);
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        await k8sApi.createNamespacedService(namespace, service);
        console.log(`Created Service: ${serviceName}`);
      } else {
        throw error;
      }
    }

    return `http://${serviceName}.${namespace}.svc.cluster.local`;
  }

  async updateStatus(namespace, name, phase, message, url = null) {
    try {
      const response = await customObjectsApi.getNamespacedCustomObject(
        GROUP,
        VERSION,
        namespace,
        PLURAL,
        name
      );

      const dummySite = response.body;

      dummySite.status = {
        phase: phase,
        message: message,
        lastUpdated: new Date().toISOString(),
        ...(url && { url: url }),
      };

      await customObjectsApi.patchNamespacedCustomObjectStatus(
        GROUP,
        VERSION,
        namespace,
        PLURAL,
        name,
        dummySite,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            "Content-Type": "application/merge-patch+json",
          },
        }
      );

      console.log(
        `Updated status for ${namespace}/${name}: ${phase} - ${message}`
      );
    } catch (error) {
      console.error(
        `Failed to update status for ${namespace}/${name}:`,
        error.message
      );
    }
  }
}

const controller = new DummySiteController();
controller.start().catch((error) => {
  console.error("Failed to start controller:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});
