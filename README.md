# ReplicaVault

ReplicaVault is a cloud-native microservice application designed to emulate the functionalities of Dropbox, with robust support for distributed file storage using **GlusterFS**. This project was developed for the Cloud Computing Technologies course and demonstrates fault tolerance, scalability, and high availability.

## 🌐 Live Demo

You can test the live instance at: [https://replicavault.nicklab.it](https://replicavault.nicklab.it)

---

## 📦 Features

- 🔐 User registration and authentication (JWT)
- ☁️ File upload/download with user isolation
- 📁 Persistent and scalable file storage with GlusterFS
- 📊 Monitoring using Prometheus + Grafana
- 🔄 High availability and fault tolerance
- 🟢 Uptime monitoring with Uptime Kuma

---

## 🛠️ GlusterFS Cluster Setup

1. **Create 2 VMs** (e.g., `server1`, `server2`) each with:
   - 1 vCPU
   - 2GB RAM
   - 2 Disks (20GB for OS, 10GB for Gluster data)

2. **Install GlusterFS** (on both nodes):
   ```bash
   sudo apt update
   sudo apt install glusterfs-server
   sudo systemctl enable --now glusterd
   ```

3. **Prepare and mount volumes**:
   ```bash
   sudo mkfs.xfs /dev/sdb
   sudo mkdir -p /mnt/gluster-test
   sudo mount /dev/sdb /mnt/gluster-test
   ```

4. **Peer probe and create volume** (on `server1`):
   ```bash
   sudo gluster peer probe server2
   sudo gluster volume create gv0 replica 2 server1:/mnt/gluster-test server2:/mnt/gluster-test force
   sudo gluster volume start gv0
   ```

5. **Mount volume** on both nodes:
   ```bash
   sudo mount -t glusterfs server1:/gv0 /mnt/gluster-test
   ```

6. **Firewall**: Allow ports `24007`, `24008`, and `24009`.

---

## 🐳 Docker Microservices Setup

### 1. Structure
- `frontend/` (React app)
- `backend/` (Flask API)
- `docker-compose.yml`

### 2. `.env` variables:
```env
POSTGRES_USER=replicavault
POSTGRES_PASSWORD=securepassword
POSTGRES_DB=replicavaultdb
DATABASE_URL=postgresql://replicavault:securepassword@db/replicavaultdb
JWT_SECRET_KEY=your_secret
```

### 3. `docker-compose.yml` (key points)
```yaml
services:
  db:
    image: postgres:13
    ...

  backend:
    build: ./backend
    volumes:
      - /mnt/gluster-test:/app/uploads
    ...

  frontend:
    build: ./frontend
    ...
```

### 4. Start the services
```bash
docker-compose up --build -d
```

---

## 📈 Monitoring Setup

- **Prometheus** with a custom GlusterFS metric exporter (bash script)
- **Grafana** dashboard connected to Prometheus
- Script runs via `cron` every 5 minutes and exposes `.prom` metrics:

```bash
#!/bin/bash

METRICS_FILE="/var/lib/node_exporter/textfile_collector/gluster.prom"
GLUSTER="/usr/sbin/gluster"  # or which gluster if dynamic
SSH="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 peer1"

# Start fresh
echo "# HELP gluster_volume_count Number of Gluster volumes" > $METRICS_FILE
echo "# TYPE gluster_volume_count gauge" >> $METRICS_FILE
VOLUMES=$($GLUSTER volume list | wc -l)
echo "gluster_volume_count $VOLUMES" >> $METRICS_FILE

echo "# HELP gluster_peer_count Number of connected Gluster peers" >> $METRICS_FILE
echo "# TYPE gluster_peer_count gauge" >> $METRICS_FILE
PEERS=$($GLUSTER peer status | grep -c 'Hostname')
echo "gluster_peer_count $PEERS" >> $METRICS_FILE

# --- BRICKS STATUS ---
echo "# HELP gluster_brick_up Whether the brick is online (1) or offline (0)" >> $METRICS_FILE
echo "# TYPE gluster_brick_up gauge" >> $METRICS_FILE

# List all bricks in all volumes
$GLUSTER volume list | while read vol; do
    $GLUSTER volume status "$vol" | grep '^Brick' | while read -r line; do
        # Example line: Brick server2:/data/brick1  Y
        brick_name=$(echo "$line" | awk '{print $2}')
        status=$(echo "$line" | awk '{print $5}')
        status_val=0
        [[ "$status" == "Y" ]] && status_val=1

        # sanitize brick_name for label (replace / and :)
        brick_label=$(echo "$brick_name" | sed 's/[:\/]/_/g')

        echo "gluster_brick_up{brick=\"$brick_label\",volume=\"$vol\"} $status_val" >> $METRICS_FILE
    done
done

echo "# HELP gluster_remote_peer_connected Whether remote peer is connected (1) or not (0)" >> $METRICS_FILE
echo "# TYPE gluster_remote_peer_connected gauge" >> $METRICS_FILE

PEER_IP="peer"
peer_status=$($SSH $PEER_IP "sudo $GLUSTER peer status" 2>/dev/null | grep -c 'Hostname')
peer_val=0
[[ $peer_status -gt 0 ]] && peer_val=1

echo "gluster_remote_peer_connected{peer_ip=\"$PEER_IP\"} $peer_val" >> $METRICS_FILE

# --- DISK USAGE OF MOUNT POINT ---
echo "# HELP gluster_mount_disk_free_bytes Free bytes on mount point" >> $METRICS_FILE
echo "# TYPE gluster_mount_disk_free_bytes gauge" >> $METRICS_FILE

echo "# HELP gluster_mount_disk_total_bytes Total bytes on mount point" >> $METRICS_FILE
echo "# TYPE gluster_mount_disk_total_bytes gauge" >> $METRICS_FILE

MOUNT_POINT="/mnt/gluster-test"

if [ -d "$MOUNT_POINT" ]; then
    df_out=$(df -B1 "$MOUNT_POINT" | tail -1)
    total_bytes=$(echo "$df_out" | awk '{print $2}')
    free_bytes=$(echo "$df_out" | awk '{print $4}')

    echo "gluster_mount_disk_total_bytes{mount=\"$MOUNT_POINT\"} $total_bytes" >> $METRICS_FILE
    echo "gluster_mount_disk_free_bytes{mount=\"$MOUNT_POINT\"} $free_bytes" >> $METRICS_FILE
fi
```

- **Uptime Kuma**: Tracks website availability and response time.

---

## ✅ Demonstration Activities

- Upload a file, verify it's replicated across both nodes.
- Delete a file, confirm deletion on both nodes.
- Stop `glusterd` on one node — app continues to work.
- Power off one VM — app remains functional via the other node.

---

## 📌 Non-Functional Properties

- ⚙️ Fault Tolerance
- 🟢 High Availability
- 🚀 Horizontal Scalability
- 🔐 Secure Multi-user Isolation

---

## 📚 Conclusion

ReplicaVault illustrates how GlusterFS can power a resilient, distributed, and scalable file storage platform. It’s a great demonstration of applying cloud-native principles in real-world microservice applications.
