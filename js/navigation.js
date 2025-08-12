import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

class NavigationManager {
  constructor() {
    this.currentUser = null;
    this.isAdmin = false;
    this.init();
  }

  init() {
    this.loadNavigation();
    this.loadFooter();
    this.setupAuthStateListener();
    this.setupNavigationHandlers();
    setTimeout(() => this.setActiveNavItem(), 100);
  }

  loadNavigation() {
    const navbarHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary fixed-top shadow">
          <div class="container">
            <a class="navbar-brand fw-bold" href="#" onclick="navigateToHome()">
              <i class="bi bi-heart-fill me-2"></i>VolunteerHub
            </a>
            <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
              <ul class="navbar-nav me-auto" id="mainNavMenu">
                <li class="nav-item regular-nav">
                  <a class="nav-link px-3" href="#" onclick="navigateTo('dashboard')">
                    <i class="bi bi-speedometer2 me-2"></i>Dashboard
                  </a>
                </li>
                <li class="nav-item regular-nav">
                  <a class="nav-link px-3" href="#" onclick="navigateTo('opportunities')">
                    <i class="bi bi-search me-2"></i>Find Opportunities
                  </a>
                </li>
                <li class="nav-item regular-nav">
                  <a class="nav-link px-3" href="#" onclick="navigateTo('my-activities')">
                    <i class="bi bi-clipboard-check me-2"></i>My Activities
                  </a>
                </li>
              </ul>
              <ul class="navbar-nav">
                <!-- User Dropdown -->
                <li class="nav-item dropdown" id="userDropdown" style="display: none;">
                  <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <div class="user-avatar me-2">
                      <i class="bi bi-person-circle fs-4" id="userAvatar"></i>
                    </div>
                    <span id="userName" class="d-none d-lg-inline">User</span>
                    <span class="badge bg-warning text-dark ms-2 d-none" id="adminBadge">ADMIN</span>
                  </a>
                  
                  <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                    <!-- User Info Header -->
                    <li>
                      <div class="dropdown-item-text">
                        <div class="d-flex align-items-center">
                          <i class="bi bi-person-circle fs-3 me-3"></i>
                          <div>
                            <div class="fw-semibold" id="userNameFull">User Name</div>
                            <div class="small text-muted" id="userEmail">user@example.com</div>
                            <div class="small" id="userRole" style="display: none;">
                              <span class="badge bg-danger">Administrator</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    <li><hr class="dropdown-divider my-2"></li>
                    
                    <!-- Admin Dashboard (will be added dynamically for admins) -->
                    <li id="adminDashboardItem" style="display: none;">
                      <a class="dropdown-item py-2 text-warning fw-bold" href="#" onclick="navigateTo('admin-dashboard')">
                        <i class="bi bi-shield-check me-2"></i>Admin Dashboard
                      </a>
                    </li>
                    
                    <!-- Profile Options -->
                    <li class="regular-user-item">
                      <a class="dropdown-item py-2" href="#" onclick="navigateTo('profile')">
                        <i class="bi bi-person me-2"></i>My Profile
                      </a>
                    </li>
                    <li class="regular-user-item">
                      <a class="dropdown-item py-2" href="#" onclick="navigateTo('edit-profile')">
                        <i class="bi bi-pencil-square me-2"></i>Edit Profile
                      </a>
                    </li>
                    <li class="regular-user-item">
                      <a class="dropdown-item py-2" href="#" onclick="navigateTo('impact')">
                        <i class="bi bi-bar-chart me-2"></i>Impact Report
                      </a>
                    </li>
                    
                    <li><hr class="dropdown-divider my-2"></li>
                    
                    <!-- Logout -->
                    <li>
                      <a class="dropdown-item py-2 text-danger" href="#" onclick="handleLogout()">
                        <i class="bi bi-box-arrow-right me-2"></i>Logout
                      </a>
                    </li>
                  </ul>
                </li>

                <!-- Guest User Buttons -->
                <li class="nav-item" id="authButtons">
                  <div class="d-flex gap-2">
                    <a class="btn btn-outline-light btn-sm" href="#" onclick="navigateTo('login')">
                      <i class="bi bi-box-arrow-in-right me-1"></i>Login
                    </a>
                    <a class="btn btn-light btn-sm" href="#" onclick="navigateTo('register')">
                      <i class="bi bi-person-plus me-1"></i>Register
                    </a>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </nav>`;

    document.body.insertAdjacentHTML("afterbegin", navbarHTML);
  }

  loadFooter() {
    const footerHTML = `
        <footer class="bg-dark text-white py-5 mt-5">
            <div class="container">
                <div class="row">
                    <div class="col-lg-4 mb-4">
                        <h5><i class="bi bi-heart-fill text-danger"></i> VolunteerHub</h5>
                        <p class="text-light">Connecting volunteers with meaningful opportunities to make a difference in their communities.</p>
                        <div class="social-links">
                            <a href="#" class="text-white me-3 fs-5"><i class="bi bi-facebook"></i></a>
                            <a href="#" class="text-white me-3 fs-5"><i class="bi bi-twitter"></i></a>
                            <a href="#" class="text-white me-3 fs-5"><i class="bi bi-instagram"></i></a>
                            <a href="#" class="text-white fs-5"><i class="bi bi-linkedin"></i></a>
                        </div>
                    </div>
                    <div class="col-lg-8 row">
                        <div class="col-md-4 mb-4">
                            <h6 class="text-white-50">Quick Links</h6>
                            <ul class="list-unstyled">
                                <li class="mb-2"><a href="#" onclick="navigateTo('opportunities')" class="text-light text-decoration-none">Find Opportunities</a></li>
                                <li class="mb-2"><a href="#" onclick="navigateTo('resources')" class="text-light text-decoration-none">Resources</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Help Center</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Contact Us</a></li>
                            </ul>
                        </div>
                        <div class="col-md-4 mb-4">
                            <h6 class="text-white-50">Support</h6>
                            <ul class="list-unstyled">
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Help Center</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Contact Us</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Safety Guidelines</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Report Issue</a></li>
                            </ul>
                        </div>
                        <div class="col-md-4 mb-4">
                            <h6 class="text-white-50">Legal</h6>
                            <ul class="list-unstyled">
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Privacy Policy</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Terms of Service</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Cookie Policy</a></li>
                                <li class="mb-2"><a href="#" class="text-light text-decoration-none">Accessibility</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <hr class="my-4">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <p class="mb-0">&copy; 2025 VolunteerHub. All rights reserved.</p>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <p class="mb-0">Made with <i class="bi bi-heart text-danger"></i> for volunteers everywhere</p>
                    </div>
                </div>
            </div>
        </footer>`;

    document.body.insertAdjacentHTML("beforeend", footerHTML);
  }

  setupNavigationHandlers() {
    window.navigateTo = this.navigateTo.bind(this);
    window.navigateToHome = this.navigateToHome.bind(this);
    window.handleLogout = this.logout.bind(this);
  }

  getBasePath() {
    const path = window.location.pathname;
    if (path.includes("/pages/") || path.includes("/auth/")) {
      return "../";
    }
    return "./";
  }

  navigateTo(page) {
    const basePath = this.getBasePath();
    const routes = {
      dashboard: `${basePath}pages/dashboard.html`,
      opportunities: `${basePath}pages/opportunities.html`,
      "my-activities": `${basePath}pages/my-activities.html`,
      profile: `${basePath}auth/profile.html`,
      "edit-profile": `${basePath}auth/profile.html?mode=edit`,
      impact: `${basePath}pages/impact.html`,
      settings: `${basePath}pages/settings.html`,
      resources: `${basePath}pages/resources.html`,
      login: `${basePath}auth/login.html`,
      register: `${basePath}auth/register.html`,
      "admin-dashboard": `${basePath}pages/admin-dashboard.html`,
    };

    if (routes[page]) {
      window.location.href = routes[page];
    }
  }

  navigateToHome() {
    const basePath = this.getBasePath();
    window.location.href = `${basePath}index.html`;
  }

  setupAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
      console.log("🔄 Auth state changed, user:", user ? user.email : "none");

      this.currentUser = user;
      if (user) {
        console.log("👤 Checking admin status for:", user.uid);
        await this.checkAdminStatus(user);
        await this.updateNavForLoggedInUser(user);

        // ADMIN REDIRECT LOGIC
        console.log("🔐 Is admin?", this.isAdmin);
        if (this.isAdmin) {
          const currentPath = window.location.pathname;
          console.log("📍 Current path:", currentPath);

          // Don't redirect if already on admin dashboard
          if (!currentPath.includes("admin-dashboard.html")) {
            console.log("🔄 Redirecting admin to admin dashboard...");
            setTimeout(() => {
              window.location.href =
                this.getBasePath() + "pages/admin-dashboard.html";
            }, 1000);
          }
        }
      } else {
        this.isAdmin = false;
        this.updateNavForLoggedOutUser();
      }
    });
  }

  async checkAdminStatus(user) {
    try {
      console.log("🔍 Checking admin doc for UID:", user.uid);
      const adminDoc = await getDoc(doc(db, "admins", user.uid));

      console.log("📄 Admin doc exists?", adminDoc.exists());
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        console.log("📋 Admin data:", adminData);
        console.log(
          "✅ isActive value:",
          adminData.isActive,
          "Type:",
          typeof adminData.isActive
        );

        this.isAdmin = adminData.isActive === true;
      } else {
        this.isAdmin = false;
      }

      console.log("🎯 Final admin status:", this.isAdmin);
    } catch (error) {
      console.error("❌ Error checking admin status:", error);
      this.isAdmin = false;
    }
  }

  async updateNavForLoggedInUser(user) {
    const userDropdown = document.getElementById("userDropdown");
    const authButtons = document.getElementById("authButtons");
    const regularNavItems = document.querySelectorAll(".regular-nav");
    const regularUserItems = document.querySelectorAll(".regular-user-item");
    const adminBadge = document.getElementById("adminBadge");
    const userRole = document.getElementById("userRole");
    const userAvatar = document.getElementById("userAvatar");
    const adminDashboardItem = document.getElementById("adminDashboardItem");

    if (userDropdown && authButtons) {
      userDropdown.style.display = "block";
      authButtons.style.display = "none";

      // Update user information
      document.getElementById("userEmail").textContent = user.email;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const displayName = userDoc.exists()
          ? userDoc.data().name || user.email.split("@")[0]
          : user.email.split("@")[0];

        document.getElementById("userName").textContent = displayName;
        document.getElementById("userNameFull").textContent = displayName;
      } catch (error) {
        const displayName = user.email.split("@")[0];
        document.getElementById("userName").textContent = displayName;
        document.getElementById("userNameFull").textContent = displayName;
      }

      // Handle admin vs regular user UI
      if (this.isAdmin) {
        console.log("🔧 Setting up admin UI...");

        // Hide regular nav items for admin
        regularNavItems.forEach((item) => {
          item.style.display = "none";
        });

        // Hide regular user dropdown items for admin
        regularUserItems.forEach((item) => {
          item.style.display = "none";
        });

        // Show admin elements
        if (adminBadge) {
          adminBadge.classList.remove("d-none");
        }
        if (userRole) {
          userRole.style.display = "block";
        }
        if (userAvatar) {
          userAvatar.className = "bi bi-person-circle fs-4 text-warning";
        }
        if (adminDashboardItem) {
          adminDashboardItem.style.display = "block";
        }
      } else {
        // Show regular nav items for normal users
        regularNavItems.forEach((item) => {
          item.style.display = "block";
        });

        // Show regular user dropdown items
        regularUserItems.forEach((item) => {
          item.style.display = "block";
        });

        // Hide admin elements
        if (adminBadge) {
          adminBadge.classList.add("d-none");
        }
        if (userRole) {
          userRole.style.display = "none";
        }
        if (userAvatar) {
          userAvatar.className = "bi bi-person-circle fs-4";
        }
        if (adminDashboardItem) {
          adminDashboardItem.style.display = "none";
        }
      }
    }
  }

  updateNavForLoggedOutUser() {
    const userDropdown = document.getElementById("userDropdown");
    const authButtons = document.getElementById("authButtons");
    const regularNavItems = document.querySelectorAll(".regular-nav");

    if (userDropdown && authButtons) {
      userDropdown.style.display = "none";
      authButtons.style.display = "block";
      regularNavItems.forEach((item) => {
        item.style.display = "block";
      });
    }
  }

  setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll(".navbar-nav .nav-link");

    navItems.forEach((item) => {
      const href = item.getAttribute("href");
      if (href && currentPath.includes(href.split("/").pop()?.split(".")[0])) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  async logout() {
    try {
      await signOut(auth);
      const currentPath = window.location.pathname;
      if (currentPath.includes("/pages/") || currentPath.includes("/auth/")) {
        window.location.href = "../index.html";
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new NavigationManager();
});
