import { auth, db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

class AdminDashboard {
  constructor() {
    this.currentUser = null;
    this.pendingApplications = [];
  }

  async init() {
    console.log("🚀 Initializing Admin Dashboard...");
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("👤 User logged in:", user.email);
        this.currentUser = user;
        const isAdmin = await this.checkAdminStatus();
        console.log("🔐 Admin status:", isAdmin);

        if (isAdmin) {
          console.log("✅ Loading admin dashboard...");
          await this.loadDashboardData();
        } else {
          console.log("❌ Access denied - not admin");
          alert("Access denied. Admin privileges required.");
          window.location.href = "../pages/dashboard.html";
        }
      } else {
        console.log("❌ No user logged in");
        window.location.href = "../auth/login.html";
      }
    });
  }

  async checkAdminStatus() {
    try {
      console.log("🔍 Checking admin status for UID:", this.currentUser.uid);
      const adminDoc = await getDoc(doc(db, "admins", this.currentUser.uid));
      const exists = adminDoc.exists();
      const isActive = exists ? adminDoc.data().isActive === true : false;

      console.log("📄 Admin doc exists:", exists);
      if (exists) {
        console.log("📋 Admin data:", adminDoc.data());
      }

      return exists && isActive;
    } catch (error) {
      console.error("❌ Error checking admin status:", error);
      return false;
    }
  }

  async loadDashboardData() {
    console.log("📊 Loading dashboard data...");
    try {
      await Promise.all([
        this.loadPendingApplications(),
        this.updateStatistics(),
      ]);
      console.log("✅ Dashboard data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      this.showError("Failed to load dashboard data. Please refresh the page.");
    }
  }

  async loadPendingApplications() {
    try {
      console.log("📋 Loading pending applications...");

      // Show loading state
      const container = document.getElementById("pendingApplicationsList");
      if (container) {
        container.innerHTML = `
          <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading applications...</p>
          </div>
        `;
      }

      const pendingQuery = query(
        collection(db, "applications"),
        where("status", "==", "pending"),
        orderBy("appliedAt", "desc")
      );

      const pendingSnapshot = await getDocs(pendingQuery);
      console.log("📊 Found pending applications:", pendingSnapshot.size);

      this.pendingApplications = [];

      for (const docSnap of pendingSnapshot.docs) {
        const application = { id: docSnap.id, ...docSnap.data() };
        console.log("📝 Processing application:", application.id);

        try {
          // Load opportunity and user details
          const [oppDoc, userDoc] = await Promise.all([
            getDoc(doc(db, "opportunities", application.opportunityId)),
            getDoc(doc(db, "users", application.userId)),
          ]);

          if (oppDoc.exists() && userDoc.exists()) {
            application.opportunity = oppDoc.data();
            application.user = userDoc.data();
            this.pendingApplications.push(application);
            console.log(
              "✅ Added application for:",
              application.opportunity.title
            );
          } else {
            console.warn("⚠️ Missing data for application:", application.id);
          }
        } catch (error) {
          console.error("❌ Error loading application details:", error);
        }
      }

      console.log(
        "📊 Total processed applications:",
        this.pendingApplications.length
      );
      this.renderPendingApplications();
    } catch (error) {
      console.error("❌ Error loading pending applications:", error);
      this.showError("Failed to load applications. Please try again.");
    }
  }

  renderPendingApplications() {
    console.log("🎨 Rendering pending applications...");
    const container = document.getElementById("pendingApplicationsList");

    if (!container) {
      console.error("❌ Container 'pendingApplicationsList' not found!");
      return;
    }

    if (this.pendingApplications.length === 0) {
      console.log("ℹ️ No pending applications to show");
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-check-circle display-1 text-success mb-3"></i>
          <h4>All caught up!</h4>
          <p class="text-muted">No applications waiting for approval.</p>
          <div class="mt-3">
            <button class="btn btn-outline-primary" onclick="adminDashboard.loadDashboardData()">
              <i class="bi bi-arrow-clockwise me-2"></i>Check for New Applications
            </button>
          </div>
        </div>
      `;
      return;
    }

    console.log(
      "🎨 Rendering",
      this.pendingApplications.length,
      "applications"
    );
    container.innerHTML = this.pendingApplications
      .map(
        (app) => `
        <div class="col-md-6 col-xl-4">
          <div class="card h-100 border-warning shadow-sm">
            <div class="card-header bg-warning bg-opacity-10">
              <div class="d-flex justify-content-between align-items-center">
                <span class="badge bg-warning text-dark fw-bold">⏳ NEEDS APPROVAL</span>
                <small class="text-muted">${this.formatDate(
                  app.appliedAt
                )}</small>
              </div>
            </div>
            <div class="card-body">
              <h6 class="card-title text-primary fw-bold">${
                app.opportunity.title
              }</h6>
              <p class="text-muted small mb-2">
                <i class="bi bi-building me-1"></i>${
                  app.opportunity.organization
                }
              </p>
              
              <div class="mb-3">
                <strong>👤 Volunteer:</strong><br>
                <span class="text-primary">${app.user.name}</span><br>
                <small class="text-muted">
                  <i class="bi bi-envelope me-1"></i>${app.user.email}
                </small>
              </div>
              
              <div class="mb-3 small">
                <div class="row g-1">
                  <div class="col-12">
                    <strong>📅 Event:</strong> ${this.formatDate(
                      app.opportunity.date
                    )}
                  </div>
                  <div class="col-6">
                    <strong>⏰ Duration:</strong> ${app.opportunity.duration}h
                  </div>
                  <div class="col-6">
                    <strong>📍 Location:</strong><br>
                    <span class="text-truncate d-block">${
                      app.opportunity.location
                    }</span>
                  </div>
                </div>
              </div>
              
              <div class="d-grid gap-2">
                <button class="btn btn-success fw-bold" onclick="adminDashboard.approveApplication('${
                  app.id
                }')">
                  <i class="bi bi-check-lg me-2"></i>✅ APPROVE
                </button>
                <button class="btn btn-danger fw-bold" onclick="adminDashboard.declineApplication('${
                  app.id
                }')">
                  <i class="bi bi-x-lg me-2"></i>❌ DECLINE
                </button>
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    console.log("✅ Applications rendered successfully");
  }

  async approveApplication(applicationId) {
    console.log("✅ Attempting to approve application:", applicationId);
    if (
      confirm("✅ Are you sure you want to APPROVE this volunteer application?")
    ) {
      try {
        await updateDoc(doc(db, "applications", applicationId), {
          status: "approved",
          approvedBy: this.currentUser.uid,
          approvedAt: new Date(),
        });

        console.log("✅ Application approved successfully");
        this.showToast("✅ Application approved successfully!", "success");
        await this.loadDashboardData();
      } catch (error) {
        console.error("❌ Error approving application:", error);
        this.showToast("❌ Error approving application", "danger");
      }
    }
  }

  async declineApplication(applicationId) {
    console.log("❌ Attempting to decline application:", applicationId);
    const reason = prompt(
      "Please provide a reason for decline (optional):\n\n" +
        "Examples:\n" +
        "• Application incomplete\n" +
        "• Does not meet requirements\n" +
        "• Position already filled"
    );

    if (reason !== null) {
      // User didn't cancel
      try {
        await updateDoc(doc(db, "applications", applicationId), {
          status: "rejected",
          rejectedBy: this.currentUser.uid,
          rejectedAt: new Date(),
          rejectionReason: reason || "No reason provided",
        });

        console.log("❌ Application declined successfully");
        this.showToast("❌ Application declined", "warning");
        await this.loadDashboardData();
      } catch (error) {
        console.error("❌ Error declining application:", error);
        this.showToast("❌ Error declining application", "danger");
      }
    }
  }

  async updateStatistics() {
    try {
      console.log("📊 Updating statistics...");

      // Count pending
      const pendingCount = this.pendingApplications.length;
      const pendingElement = document.getElementById("pendingCount");
      if (pendingElement) {
        pendingElement.textContent = pendingCount;
      }

      // Count today's approvals and declines
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [approvedSnapshot, declinedSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, "applications"),
            where("status", "==", "approved"),
            where("approvedAt", ">=", today)
          )
        ),
        getDocs(
          query(
            collection(db, "applications"),
            where("status", "==", "rejected"),
            where("rejectedAt", ">=", today)
          )
        ),
      ]);

      const approvedElement = document.getElementById("approvedCount");
      const declinedElement = document.getElementById("declinedCount");

      if (approvedElement) approvedElement.textContent = approvedSnapshot.size;
      if (declinedElement) declinedElement.textContent = declinedSnapshot.size;

      console.log("📊 Statistics updated:", {
        pending: pendingCount,
        approved: approvedSnapshot.size,
        declined: declinedSnapshot.size,
      });
    } catch (error) {
      console.error("❌ Error updating statistics:", error);
    }
  }

  formatDate(timestamp) {
    if (!timestamp) return "Date TBD";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast-notification position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = "9999";
    toast.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show shadow">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  }

  showError(message) {
    const container = document.getElementById("pendingApplicationsList");
    if (container) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger" role="alert">
            <h5 class="alert-heading">
              <i class="bi bi-exclamation-triangle me-2"></i>Error
            </h5>
            <p class="mb-2">${message}</p>
            <button class="btn btn-outline-danger btn-sm" onclick="adminDashboard.loadDashboardData()">
              <i class="bi bi-arrow-clockwise me-1"></i>Try Again
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Initialize admin dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM loaded, initializing Admin Dashboard...");
  window.adminDashboard = new AdminDashboard();
  window.adminDashboard.init();
});
