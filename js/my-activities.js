import { auth, db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

class MyActivities {
  constructor() {
    this.currentUser = null;
    this.activities = [];
    this.currentActivity = null;
  }

  async init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadActivities();
        this.updateSummaryCards();
      } else {
        window.location.href = "../auth/login.html";
      }
    });
  }

  async loadActivities() {
    try {
      const applicationsQuery = query(
        collection(db, "applications"),
        where("userId", "==", this.currentUser.uid)
      );

      const applicationsSnapshot = await getDocs(applicationsQuery);
      this.activities = [];

      for (const docSnap of applicationsSnapshot.docs) {
        const application = { id: docSnap.id, ...docSnap.data() };

        try {
          const oppDoc = await getDoc(
            doc(db, "opportunities", application.opportunityId)
          );
          if (oppDoc.exists()) {
            application.opportunity = oppDoc.data();
            this.activities.push(application);
          }
        } catch (error) {
          console.error("Error loading opportunity details:", error);
        }
      }

      this.displayActivities();
      this.updateTabCounts();
    } catch (error) {
      console.error("Error loading activities:", error);
      this.showError("Failed to load activities. Please refresh the page.");
    }
  }

  displayActivities() {
    const allActivities = this.activities;
    const pendingActivities = this.activities.filter(
      (a) => a.status === "pending"
    );
    const approvedActivities = this.activities.filter(
      (a) => a.status === "approved"
    );
    const completedActivities = this.activities.filter(
      (a) => a.status === "completed"
    );

    this.renderActivitiesList("allActivitiesList", allActivities);
    this.renderActivitiesList("pendingActivitiesList", pendingActivities);
    this.renderActivitiesList("approvedActivitiesList", approvedActivities);
    this.renderActivitiesList("completedActivitiesList", completedActivities);
  }

  renderActivitiesList(containerId, activities) {
    const container = document.getElementById(containerId);

    if (activities.length === 0) {
      container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-inbox display-1 text-muted mb-3"></i>
                        <h4 class="text-muted">No activities found</h4>
                        <p class="text-muted mb-4">Start volunteering to see your activities here!</p>
                        <a href="opportunities.html" class="btn btn-primary">
                            <i class="bi bi-search me-2"></i>Find Opportunities
                        </a>
                    </div>
                </div>
            `;
      return;
    }

    container.innerHTML = activities
      .map((activity) => this.createActivityCard(activity))
      .join("");
  }

  createActivityCard(activity) {
    const statusBadge = this.getStatusBadge(activity.status);
    const appliedDate = this.formatDate(activity.appliedAt);
    const eventDate = this.formatDate(activity.opportunity.date);

    return `
            <div class="col-lg-6 col-xl-4">
                <div class="card h-100 shadow-sm border-0 activity-card" data-activity-id="${
                  activity.id
                }">
                    <div class="card-header bg-white border-0 d-flex justify-content-between align-items-center">
                        ${statusBadge}
                        <small class="text-muted">
                            <i class="bi bi-calendar3 me-1"></i>${appliedDate}
                        </small>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title fw-bold text-primary">${
                          activity.opportunity.title
                        }</h5>
                        <h6 class="card-subtitle mb-2 text-muted">
                            <i class="bi bi-building me-1"></i>${
                              activity.opportunity.organization
                            }
                        </h6>
                        <p class="card-text text-muted small">${this.truncateText(
                          activity.opportunity.description,
                          100
                        )}</p>
                        
                        <div class="activity-details mb-3">
                            <div class="row g-2 text-center">
                                <div class="col-4">
                                    <div class="bg-light p-2 rounded">
                                        <i class="bi bi-calendar-event text-primary"></i>
                                        <div class="small fw-semibold">${eventDate}</div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="bg-light p-2 rounded">
                                        <i class="bi bi-clock text-info"></i>
                                        <div class="small fw-semibold">${
                                          activity.opportunity.duration
                                        }h</div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="bg-light p-2 rounded">
                                        <i class="bi bi-geo-alt text-warning"></i>
                                        <div class="small fw-semibold">${this.truncateText(
                                          activity.opportunity.location,
                                          10
                                        )}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${
                          activity.hoursLogged > 0
                            ? `
                            <div class="alert alert-success py-2 mb-3">
                                <i class="bi bi-check-circle-fill me-2"></i>
                                <strong>${
                                  activity.hoursLogged
                                } hours logged</strong>
                                ${
                                  activity.experienceRating
                                    ? `
                                    <div class="mt-1">
                                        <small>Rating: ${"⭐".repeat(
                                          activity.experienceRating
                                        )}</small>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        `
                            : ""
                        }

                        <div class="d-flex gap-2 flex-wrap">
                            ${this.renderActionButtons(activity)}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  renderActionButtons(activity) {
    const buttons = [];

    if (activity.status === "approved" && activity.hoursLogged === 0) {
      buttons.push(`
                <button class="btn btn-success btn-sm" onclick="showHoursModal('${activity.id}')">
                    <i class="bi bi-clock me-1"></i>Log Hours
                </button>
            `);
    }

    if (activity.status === "pending") {
      buttons.push(`
                <button class="btn btn-outline-danger btn-sm" onclick="cancelApplication('${activity.id}')">
                    <i class="bi bi-x-circle me-1"></i>Cancel
                </button>
            `);
    }

    buttons.push(`
            <button class="btn btn-outline-primary btn-sm" onclick="viewActivityDetails('${activity.id}')">
                <i class="bi bi-eye me-1"></i>Details
            </button>
        `);

    if (activity.status === "completed" && activity.hoursLogged > 0) {
      buttons.push(`
                <button class="btn btn-outline-info btn-sm" onclick="writeReview('${activity.id}')">
                    <i class="bi bi-star me-1"></i>Review
                </button>
            `);
    }

    return buttons.join("");
  }

  getStatusBadge(status) {
    const badges = {
      pending:
        '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Pending</span>',
      approved:
        '<span class="badge bg-info"><i class="bi bi-check-circle me-1"></i>Approved</span>',
      completed:
        '<span class="badge bg-success"><i class="bi bi-trophy me-1"></i>Completed</span>',
      rejected:
        '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Rejected</span>',
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
  }

  updateSummaryCards() {
    const stats = {
      total: this.activities.length,
      completed: this.activities.filter((a) => a.status === "completed").length,
      totalHours: this.activities.reduce(
        (sum, a) => sum + (a.hoursLogged || 0),
        0
      ),
      organizations: new Set(
        this.activities.map((a) => a.opportunity?.organization)
      ).size,
    };

    document.getElementById("totalApplications").textContent = stats.total;
    document.getElementById("completedCount").textContent = stats.completed;
    document.getElementById("totalHours").textContent = stats.totalHours;
    document.getElementById("organizationsCount").textContent =
      stats.organizations;
  }

  updateTabCounts() {
    const counts = {
      all: this.activities.length,
      pending: this.activities.filter((a) => a.status === "pending").length,
      approved: this.activities.filter((a) => a.status === "approved").length,
      completed: this.activities.filter((a) => a.status === "completed").length,
    };

    document.getElementById("allCount").textContent = counts.all;
    document.getElementById("pendingCount").textContent = counts.pending;
    document.getElementById("approvedCount").textContent = counts.approved;
    document.getElementById("completedTabCount").textContent = counts.completed;
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

  truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  showError(message) {
    // Could implement toast notifications here
    console.error(message);
  }
}

// Global functions
window.showHoursModal = async (applicationId) => {
  const myActivities = window.myActivitiesInstance;
  const activity = myActivities.activities.find((a) => a.id === applicationId);

  if (activity) {
    myActivities.currentActivity = activity;

    // Populate opportunity info
    document.getElementById("opportunityInfo").innerHTML = `
            <h6 class="fw-bold text-primary">${activity.opportunity.title}</h6>
            <p class="text-muted mb-2">${activity.opportunity.organization}</p>
            <div class="row g-2 text-center">
                <div class="col-4">
                    <small class="text-muted">Event Date</small>
                    <div class="fw-semibold">${myActivities.formatDate(
                      activity.opportunity.date
                    )}</div>
                </div>
                <div class="col-4">
                    <small class="text-muted">Duration</small>
                    <div class="fw-semibold">${
                      activity.opportunity.duration
                    } hours</div>
                </div>
                <div class="col-4">
                    <small class="text-muted">Location</small>
                    <div class="fw-semibold">${
                      activity.opportunity.location
                    }</div>
                </div>
            </div>
        `;

    document.getElementById("applicationId").value = applicationId;
    const modal = new bootstrap.Modal(document.getElementById("hoursModal"));
    modal.show();
  }
};

window.submitHours = async () => {
  const applicationId = document.getElementById("applicationId").value;
  const hours = parseFloat(document.getElementById("hoursWorked").value);
  const description = document.getElementById("workDescription").value;
  const volunteerDate = document.getElementById("volunteerDate").value;
  const skillsUsed = document.getElementById("skillsUsed").value;
  const rating = document.getElementById("experienceRating").value;

  if (!hours || !description) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    const updateData = {
      hoursLogged: hours,
      workDescription: description,
      status: "completed",
      completedAt: new Date(),
      volunteerDate: volunteerDate ? new Date(volunteerDate) : new Date(),
      skillsUsed: skillsUsed ? skillsUsed.split(",").map((s) => s.trim()) : [],
      experienceRating: rating ? parseInt(rating) : null,
    };

    await updateDoc(doc(db, "applications", applicationId), updateData);

    bootstrap.Modal.getInstance(document.getElementById("hoursModal")).hide();

    // Show success modal
    const successModal = new bootstrap.Modal(
      document.getElementById("successModal")
    );
    successModal.show();

    // Reload activities
    window.myActivitiesInstance.loadActivities();
  } catch (error) {
    console.error("Error logging hours:", error);
    alert("Error logging hours. Please try again.");
  }
};

window.viewActivityDetails = (activityId) => {
  const activity = window.myActivitiesInstance.activities.find(
    (a) => a.id === activityId
  );

  if (activity) {
    const modal = document.getElementById("activityDetailsModal");
    const title = document.getElementById("activityModalTitle");
    const body = document.getElementById("activityModalBody");

    title.textContent = activity.opportunity.title;
    body.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6>Organization</h6>
                    <p>${activity.opportunity.organization}</p>
                    
                    <h6>Description</h6>
                    <p>${activity.opportunity.description}</p>
                    
                    <h6>Skills Required</h6>
                    <div class="mb-3">
                        ${
                          activity.opportunity.skillsRequired
                            ?.map(
                              (skill) =>
                                `<span class="badge bg-secondary me-1">${skill}</span>`
                            )
                            .join("") || "No specific skills required"
                        }
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body">
                            <h6>Application Details</h6>
                            <p><i class="bi bi-calendar3"></i> Applied: ${window.myActivitiesInstance.formatDate(
                              activity.appliedAt
                            )}</p>
                            <p><i class="bi bi-calendar-event"></i> Event: ${window.myActivitiesInstance.formatDate(
                              activity.opportunity.date
                            )}</p>
                            <p><i class="bi bi-clock"></i> Duration: ${
                              activity.opportunity.duration
                            } hours</p>
                            <p><i class="bi bi-geo-alt"></i> ${
                              activity.opportunity.location
                            }</p>
                            ${
                              activity.hoursLogged > 0
                                ? `
                                <hr>
                                <h6>Completed Work</h6>
                                <p><i class="bi bi-check-circle text-success"></i> ${
                                  activity.hoursLogged
                                } hours logged</p>
                                ${
                                  activity.workDescription
                                    ? `<p><small>${activity.workDescription}</small></p>`
                                    : ""
                                }
                            `
                                : ""
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

    new bootstrap.Modal(modal).show();
  }
};

window.cancelApplication = async (applicationId) => {
  if (confirm("Are you sure you want to cancel this application?")) {
    try {
      await updateDoc(doc(db, "applications", applicationId), {
        status: "cancelled",
        cancelledAt: new Date(),
      });

      window.myActivitiesInstance.loadActivities();
    } catch (error) {
      console.error("Error cancelling application:", error);
      alert("Error cancelling application. Please try again.");
    }
  }
};

window.writeReview = (activityId) => {
  // Placeholder for review functionality
  alert(
    "Review feature coming soon! This will allow you to rate and review your volunteer experience."
  );
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  window.myActivitiesInstance = new MyActivities();
  window.myActivitiesInstance.init();
});
