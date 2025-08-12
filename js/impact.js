import { auth, db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

class ImpactReportGenerator {
  constructor() {
    this.currentUser = null;
    this.userStats = {};
    this.chartInstances = {};
  }

  async init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.generateReport();
      } else {
        window.location.href = "../auth/login.html";
      }
    });
  }

  async generateReport() {
    try {
      await this.loadUserStats();
      this.displayStats();
      this.createCharts();
      this.loadAchievements();
      this.loadOrganizations();
      this.loadGoals();
    } catch (error) {
      console.error("Error generating impact report:", error);
    }
  }

  async loadUserStats() {
    const userId = this.currentUser.uid;

    // Load user applications
    const applicationsQuery = query(
      collection(db, "applications"),
      where("userId", "==", userId)
    );

    const applicationsSnapshot = await getDocs(applicationsQuery);

    let totalHours = 0;
    let completedActivities = 0;
    const organizationsSet = new Set();
    const categoriesMap = new Map();
    const monthlyHours = new Array(12).fill(0);

    for (const docSnap of applicationsSnapshot.docs) {
      const application = docSnap.data();

      if (application.status === "completed") {
        completedActivities++;
        totalHours += application.hoursLogged || 0;

        // Get opportunity details
        try {
          const oppDoc = await getDoc(
            doc(db, "opportunities", application.opportunityId)
          );
          if (oppDoc.exists()) {
            const opportunity = oppDoc.data();
            organizationsSet.add(opportunity.organization);

            // Track categories
            const category = opportunity.category || "Other";
            categoriesMap.set(
              category,
              (categoriesMap.get(category) || 0) +
                (application.hoursLogged || 0)
            );

            // Track monthly hours
            if (application.completedAt) {
              const date = application.completedAt.seconds
                ? new Date(application.completedAt.seconds * 1000)
                : new Date(application.completedAt);
              const month = date.getMonth();
              monthlyHours[month] += application.hoursLogged || 0;
            }
          }
        } catch (error) {
          console.error("Error loading opportunity details:", error);
        }
      }
    }

    this.userStats = {
      totalHours,
      completedActivities,
      organizationsCount: organizationsSet.size,
      categories: Object.fromEntries(categoriesMap),
      monthlyHours,
      organizations: Array.from(organizationsSet),
      impactedPeople: Math.floor(totalHours * 2.5), // Rough estimate
    };
  }

  displayStats() {
    // Update main statistics
    document.getElementById("totalHours").textContent =
      this.userStats.totalHours;
    document.getElementById("completedActivities").textContent =
      this.userStats.completedActivities;
    document.getElementById("organizationsCount").textContent =
      this.userStats.organizationsCount;
    document.getElementById("impactedPeople").textContent =
      this.userStats.impactedPeople;

    // Update header displays
    document.getElementById(
      "totalHoursDisplay"
    ).textContent = `${this.userStats.totalHours} hours volunteered`;
    document.getElementById(
      "totalActivitiesDisplay"
    ).textContent = `${this.userStats.completedActivities} activities completed`;
    document.getElementById(
      "totalOrgsDisplay"
    ).textContent = `${this.userStats.organizationsCount} organizations helped`;

    // Calculate and display impact score
    const impactScore = this.calculateImpactScore();
    document.getElementById("impactScore").textContent = impactScore;
  }

  calculateImpactScore() {
    const baseScore = this.userStats.totalHours * 10;
    const diversityBonus = this.userStats.organizationsCount * 50;
    const consistencyBonus = this.userStats.completedActivities > 5 ? 200 : 0;
    const categoryDiversityBonus =
      Object.keys(this.userStats.categories).length * 25;

    return Math.round(
      baseScore + diversityBonus + consistencyBonus + categoryDiversityBonus
    );
  }

  createCharts() {
    this.createMonthlyChart();
    this.createCategoriesChart();
  }

  createMonthlyChart() {
    const ctx = document.getElementById("monthlyChart");
    if (!ctx) return;

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (this.chartInstances.monthly) {
      this.chartInstances.monthly.destroy();
    }

    this.chartInstances.monthly = new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Volunteer Hours",
            data: this.userStats.monthlyHours,
            borderColor: "#007bff",
            backgroundColor: "rgba(0, 123, 255, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#007bff",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: "#007bff",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  createCategoriesChart() {
    const ctx = document.getElementById("categoriesChart");
    if (!ctx) return;

    const labels = Object.keys(this.userStats.categories);
    const data = Object.values(this.userStats.categories);

    if (labels.length === 0) {
      ctx.getContext("2d").font = "16px Arial";
      ctx.getContext("2d").fillText("No data available", 50, 100);
      return;
    }

    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF6600",
      "#FF9F40",
      "#4BC0C0",
    ];

    if (this.chartInstances.categories) {
      this.chartInstances.categories.destroy();
    }

    this.chartInstances.categories = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 3,
            borderColor: "#fff",
            hoverBorderWidth: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value}h (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  loadAchievements() {
    const achievements = [];

    // Hour-based achievements
    if (this.userStats.totalHours >= 100) {
      achievements.push({
        title: "Century Volunteer",
        description: "Completed 100+ volunteer hours",
        icon: "bi-trophy-fill",
        color: "text-warning",
        achieved: true,
      });
    } else if (this.userStats.totalHours >= 50) {
      achievements.push({
        title: "Dedicated Volunteer",
        description: "Completed 50+ volunteer hours",
        icon: "bi-star-fill",
        color: "text-warning",
        achieved: true,
      });
    } else if (this.userStats.totalHours >= 25) {
      achievements.push({
        title: "Committed Helper",
        description: "Completed 25+ volunteer hours",
        icon: "bi-star-half",
        color: "text-warning",
        achieved: true,
      });
    }

    // Next goal
    if (this.userStats.totalHours < 100) {
      const nextMilestone =
        this.userStats.totalHours < 25
          ? 25
          : this.userStats.totalHours < 50
          ? 50
          : 100;
      achievements.push({
        title: `${nextMilestone} Hour Goal`,
        description: `${
          nextMilestone - this.userStats.totalHours
        } hours to go!`,
        icon: "bi-target",
        color: "text-muted",
        achieved: false,
        progress: Math.round((this.userStats.totalHours / nextMilestone) * 100),
      });
    }

    // Activity-based achievements
    if (this.userStats.completedActivities >= 20) {
      achievements.push({
        title: "Super Volunteer",
        description: "Completed 20+ activities",
        icon: "bi-trophy-fill",
        color: "text-success",
        achieved: true,
      });
    } else if (this.userStats.completedActivities >= 10) {
      achievements.push({
        title: "Active Volunteer",
        description: "Completed 10+ activities",
        icon: "bi-award",
        color: "text-success",
        achieved: true,
      });
    }

    // Organization diversity achievement
    if (this.userStats.organizationsCount >= 5) {
      achievements.push({
        title: "Community Connector",
        description: `Helped ${this.userStats.organizationsCount} organizations`,
        icon: "bi-building",
        color: "text-info",
        achieved: true,
      });
    }

    this.renderAchievements(achievements);
  }

  renderAchievements(achievements) {
    const container = document.getElementById("achievementsList");
    if (!container) return;

    if (achievements.length === 0) {
      container.innerHTML = `
                <div class="text-center py-3">
                    <i class="bi bi-trophy display-4 text-muted"></i>
                    <p class="text-muted mt-2">Start volunteering to earn achievements!</p>
                </div>
            `;
      return;
    }

    container.innerHTML = achievements
      .map(
        (achievement) => `
            <div class="d-flex align-items-center py-2 ${
              achievement.achieved ? "" : "opacity-75"
            }">
                <div class="me-3">
                    <i class="bi ${achievement.icon} ${
          achievement.color
        } fs-4"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1 fw-semibold">${achievement.title}</h6>
                    <small class="text-muted">${achievement.description}</small>
                    ${
                      achievement.progress
                        ? `
                        <div class="progress mt-1" style="height: 6px;">
                            <div class="progress-bar" style="width: ${achievement.progress}%"></div>
                        </div>
                    `
                        : ""
                    }
                </div>
                ${
                  achievement.achieved
                    ? '<i class="bi bi-check-circle text-success ms-2"></i>'
                    : ""
                }
            </div>
        `
      )
      .join("");
  }

  loadOrganizations() {
    const container = document.getElementById("organizationsList");
    if (!container) return;

    if (this.userStats.organizations.length === 0) {
      container.innerHTML = `
                <div class="text-center py-3">
                    <i class="bi bi-building display-4 text-muted"></i>
                    <p class="text-muted mt-2">No organizations helped yet</p>
                </div>
            `;
      return;
    }

    container.innerHTML = this.userStats.organizations
      .map(
        (org) => `
            <div class="d-flex align-items-center py-2 border-bottom">
                <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                    <i class="bi bi-building text-primary"></i>
                </div>
                <div>
                    <h6 class="mb-0">${org}</h6>
                    <small class="text-muted">Volunteer Partner</small>
                </div>
            </div>
        `
      )
      .join("");
  }

  loadGoals() {
    const container = document.getElementById("goalsList");
    if (!container) return;

    // Simple goals based on current progress
    const goals = [];

    if (this.userStats.totalHours < 25) {
      goals.push({
        title: "First 25 Hours",
        current: this.userStats.totalHours,
        target: 25,
        type: "hours",
      });
    } else if (this.userStats.totalHours < 50) {
      goals.push({
        title: "50 Hour Milestone",
        current: this.userStats.totalHours,
        target: 50,
        type: "hours",
      });
    }

    if (this.userStats.completedActivities < 10) {
      goals.push({
        title: "10 Activities",
        current: this.userStats.completedActivities,
        target: 10,
        type: "activities",
      });
    }

    if (goals.length === 0) {
      container.innerHTML = `
                <div class="text-center py-3">
                    <i class="bi bi-bullseye display-4 text-muted"></i>
                    <p class="text-muted mt-2">Great progress! Set new goals to keep growing.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = goals
      .map((goal) => {
        const progress = Math.min(
          Math.round((goal.current / goal.target) * 100),
          100
        );
        return `
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-1">
                        <h6 class="mb-0">${goal.title}</h6>
                        <small class="text-muted">${goal.current}/${goal.target}</small>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
      })
      .join("");
  }
}

// Initialize impact report
document.addEventListener("DOMContentLoaded", () => {
  const impactGenerator = new ImpactReportGenerator();
  impactGenerator.init();
});
