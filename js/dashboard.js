import { auth, db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

class Dashboard {
  constructor() {
    this.currentUser = null;
    this.userStats = {
      totalHours: 0,
      completedActivities: 0,
      pendingActivities: 0,
      organizationsCount: 0,
    };
  }

  async init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData();
        await this.loadDashboardData();
      } else {
        window.location.href = "../auth/login.html";
      }
    });
  }

  async loadUserData() {
    try {
      const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const welcomeElement = document.getElementById("userWelcomeName");
        if (welcomeElement) {
          welcomeElement.textContent = userData.name || "Volunteer";
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      // Fallback to email display
      const welcomeElement = document.getElementById("userWelcomeName");
      if (welcomeElement) {
        welcomeElement.textContent = this.currentUser.email.split("@")[0];
      }
    }
  }

  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadUserStats(),
        this.loadRecentActivities(),
        this.loadRecommendedOpportunities(),
        this.loadUpcomingEvents(),
        this.loadAchievements(),
      ]);
      this.updateStatsDisplay();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      this.showErrorMessage(
        "Unable to load dashboard data. Please refresh the page."
      );
    }
  }

  async loadUserStats() {
    try {
      const applicationsQuery = query(
        collection(db, "applications"),
        where("userId", "==", this.currentUser.uid)
      );

      const applicationsSnapshot = await getDocs(applicationsQuery);
      const organizations = new Set();

      // Reset stats
      this.userStats = {
        totalHours: 0,
        completedActivities: 0,
        pendingActivities: 0,
        organizationsCount: 0,
      };

      for (const docSnap of applicationsSnapshot.docs) {
        const application = docSnap.data();

        // Load organization info to count unique organizations
        try {
          const oppDoc = await getDoc(
            doc(db, "opportunities", application.opportunityId)
          );
          if (oppDoc.exists()) {
            const opportunity = oppDoc.data();
            organizations.add(opportunity.organization);
          }
        } catch (error) {
          console.error("Error loading opportunity for stats:", error);
        }

        // Update stats based on application status
        if (application.status === "completed") {
          this.userStats.completedActivities++;
          this.userStats.totalHours += application.hoursLogged || 0;
        } else if (application.status === "pending") {
          this.userStats.pendingActivities++;
        }
      }

      this.userStats.organizationsCount = organizations.size;
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  }

  async loadRecentActivities() {
    try {
      const applicationsQuery = query(
        collection(db, "applications"),
        where("userId", "==", this.currentUser.uid),
        limit(5)
      );

      const applicationsSnapshot = await getDocs(applicationsQuery);
      const activitiesHtml = [];

      for (const docSnap of applicationsSnapshot.docs) {
        const application = docSnap.data();
        try {
          const oppDoc = await getDoc(
            doc(db, "opportunities", application.opportunityId)
          );
          if (oppDoc.exists()) {
            const opportunity = oppDoc.data();
            const appliedDate = this.formatDate(application.appliedAt);

            activitiesHtml.push(`
              <div class="d-flex justify-content-between align-items-center py-3 border-bottom">
                <div class="flex-grow-1">
                  <h6 class="mb-1 fw-semibold">${opportunity.title}</h6>
                  <p class="mb-1 text-muted small">${
                    opportunity.organization
                  }</p>
                  <small class="text-muted">
                    <i class="bi bi-calendar3 me-1"></i>Applied: ${appliedDate}
                  </small>
                </div>
                <div class="text-end">
                  <span class="badge bg-${this.getStatusColor(
                    application.status
                  )} mb-1">
                    ${this.capitalizeFirst(application.status)}
                  </span>
                  ${
                    application.hoursLogged > 0
                      ? `<div><small class="text-success">
                      <i class="bi bi-clock me-1"></i>${application.hoursLogged}h logged
                    </small></div>`
                      : ""
                  }
                </div>
              </div>
            `);
          }
        } catch (error) {
          console.error("Error loading opportunity details:", error);
        }
      }

      const recentActivitiesElement =
        document.getElementById("recentActivities");
      if (recentActivitiesElement) {
        recentActivitiesElement.innerHTML =
          activitiesHtml.length > 0
            ? activitiesHtml.join("")
            : `<div class="text-center py-4">
                <i class="bi bi-inbox display-4 text-muted mb-3"></i>
                <p class="text-muted mb-3">No activities yet</p>
                <a href="opportunities.html" class="btn btn-primary btn-sm">Find Your First Opportunity</a>
               </div>`;
      }
    } catch (error) {
      console.error("Error loading recent activities:", error);
      const recentActivitiesElement =
        document.getElementById("recentActivities");
      if (recentActivitiesElement) {
        recentActivitiesElement.innerHTML =
          '<p class="text-danger">Error loading activities.</p>';
      }
    }
  }

  async loadRecommendedOpportunities() {
    try {
      const oppsQuery = query(
        collection(db, "opportunities"),
        where("status", "==", "active"),
        limit(3)
      );

      const oppsSnapshot = await getDocs(oppsQuery);
      const recommendationsHtml = [];

      oppsSnapshot.forEach((docSnap) => {
        const opportunity = { id: docSnap.id, ...docSnap.data() };
        const eventDate = this.formatDate(opportunity.date);

        recommendationsHtml.push(`
          <div class="col-12 mb-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="badge bg-primary">${opportunity.category}</span>
                  <small class="text-muted">${eventDate}</small>
                </div>
                <h6 class="card-title fw-semibold">${opportunity.title}</h6>
                <p class="card-text text-muted small mb-2">${
                  opportunity.organization
                }</p>
                <p class="card-text small mb-3">${this.truncateText(
                  opportunity.description,
                  80
                )}</p>
                <div class="d-flex justify-content-between align-items-center">
                  <small class="text-muted">
                    <i class="bi bi-clock me-1"></i>${opportunity.duration}h
                    <i class="bi bi-people ms-2 me-1"></i>${
                      opportunity.currentVolunteers?.length || 0
                    }/${opportunity.maxVolunteers}
                  </small>
                  <button class="btn btn-sm btn-outline-primary" onclick="window.open('opportunities.html#${
                    opportunity.id
                  }', '_blank')">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        `);
      });

      const recommendedElement = document.getElementById(
        "recommendedOpportunities"
      );
      if (recommendedElement) {
        recommendedElement.innerHTML =
          recommendationsHtml.length > 0
            ? recommendationsHtml.join("")
            : `<div class="col-12 text-center py-4">
                <i class="bi bi-lightbulb display-4 text-muted mb-3"></i>
                <p class="text-muted mb-3">No recommendations available</p>
                <p class="small text-muted">Complete your profile to get personalized recommendations</p>
               </div>`;
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
      const recommendedElement = document.getElementById(
        "recommendedOpportunities"
      );
      if (recommendedElement) {
        recommendedElement.innerHTML =
          '<div class="col-12"><p class="text-danger">Error loading recommendations.</p></div>';
      }
    }
  }

  async loadUpcomingEvents() {
    try {
      const applicationsQuery = query(
        collection(db, "applications"),
        where("userId", "==", this.currentUser.uid),
        where("status", "in", ["approved", "pending"])
      );

      const applicationsSnapshot = await getDocs(applicationsQuery);
      const eventsHtml = [];

      for (const docSnap of applicationsSnapshot.docs) {
        const application = docSnap.data();
        try {
          const oppDoc = await getDoc(
            doc(db, "opportunities", application.opportunityId)
          );
          if (oppDoc.exists()) {
            const opportunity = oppDoc.data();
            const eventDate = new Date(
              opportunity.date?.seconds * 1000 || opportunity.date
            );

            if (eventDate > new Date()) {
              eventsHtml.push(`
                <div class="d-flex justify-content-between align-items-center py-3 border-bottom">
                  <div>
                    <h6 class="mb-1 fw-semibold">${opportunity.title}</h6>
                    <small class="text-muted">
                      <i class="bi bi-calendar3 me-1"></i>${this.formatDate(
                        opportunity.date
                      )}
                      <i class="bi bi-clock ms-2 me-1"></i>${
                        opportunity.duration
                      }h
                    </small>
                  </div>
                  <span class="badge bg-${this.getStatusColor(
                    application.status
                  )}">
                    ${this.capitalizeFirst(application.status)}
                  </span>
                </div>
              `);
            }
          }
        } catch (error) {
          console.error("Error loading event details:", error);
        }
      }

      const upcomingElement = document.getElementById("upcomingEvents");
      if (upcomingElement) {
        upcomingElement.innerHTML =
          eventsHtml.length > 0
            ? eventsHtml.join("")
            : `<div class="text-center py-4">
                <i class="bi bi-calendar-x display-4 text-muted mb-3"></i>
                <p class="text-muted">No upcoming events</p>
               </div>`;
      }
    } catch (error) {
      console.error("Error loading upcoming events:", error);
      const upcomingElement = document.getElementById("upcomingEvents");
      if (upcomingElement) {
        upcomingElement.innerHTML =
          '<p class="text-danger">Error loading events.</p>';
      }
    }
  }

  loadAchievements() {
    const achievements = [];

    // Hour-based achievements
    if (this.userStats.totalHours >= 50) {
      achievements.push({
        title: "Dedicated Volunteer",
        description: "Completed 50+ volunteer hours",
        icon: "bi-star-fill",
        color: "text-warning",
      });
    } else if (this.userStats.totalHours >= 25) {
      achievements.push({
        title: "Committed Helper",
        description: "Completed 25+ volunteer hours",
        icon: "bi-star-half",
        color: "text-warning",
      });
    } else if (this.userStats.totalHours >= 10) {
      achievements.push({
        title: "Getting Started",
        description: "Completed 10+ volunteer hours",
        icon: "bi-star",
        color: "text-warning",
      });
    }

    // Activity-based achievements
    if (this.userStats.completedActivities >= 10) {
      achievements.push({
        title: "Super Volunteer",
        description: "Completed 10+ activities",
        icon: "bi-trophy-fill",
        color: "text-success",
      });
    } else if (this.userStats.completedActivities >= 5) {
      achievements.push({
        title: "Active Volunteer",
        description: "Completed 5+ activities",
        icon: "bi-trophy",
        color: "text-success",
      });
    }

    // Organization diversity achievement
    if (this.userStats.organizationsCount >= 3) {
      achievements.push({
        title: "Community Connector",
        description: `Worked with ${this.userStats.organizationsCount} organizations`,
        icon: "bi-building",
        color: "text-info",
      });
    }

    const achievementsHtml = achievements.map(
      (achievement) => `
      <div class="d-flex align-items-center py-3 border-bottom">
        <div class="me-3">
          <i class="bi ${achievement.icon} ${achievement.color} fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="mb-1 fw-semibold">${achievement.title}</h6>
          <small class="text-muted">${achievement.description}</small>
        </div>
      </div>
    `
    );

    const achievementsElement = document.getElementById("recentAchievements");
    if (achievementsElement) {
      achievementsElement.innerHTML =
        achievementsHtml.length > 0
          ? achievementsHtml.join("")
          : `<div class="text-center py-4">
              <i class="bi bi-trophy display-4 text-muted mb-3"></i>
              <p class="text-muted mb-2">No achievements yet</p>
              <p class="small text-muted">Start volunteering to earn your first achievement!</p>
             </div>`;
    }
  }

  updateStatsDisplay() {
    const elements = {
      totalHours: this.userStats.totalHours,
      completedActivities: this.userStats.completedActivities,
      pendingActivities: this.userStats.pendingActivities,
      organizationsCount: this.userStats.organizationsCount,
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        // Animate number change
        this.animateNumber(element, value);
      }
    });
  }

  // Utility Methods
  animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const increment = targetValue > currentValue ? 1 : -1;
    const step = () => {
      const current = parseInt(element.textContent) || 0;
      if (current !== targetValue) {
        element.textContent = current + increment;
        requestAnimationFrame(step);
      }
    };
    step();
  }

  getStatusColor(status) {
    const colors = {
      pending: "warning",
      approved: "info",
      completed: "success",
      rejected: "danger",
    };
    return colors[status] || "secondary";
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  showErrorMessage(message) {
    // You can implement a toast notification system here
    console.error(message);
  }
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new Dashboard();
  dashboard.init();
});
