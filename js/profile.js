import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
  }

  async init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserProfile();
        await this.loadUserStats();
        this.setupFormHandlers();
      } else {
        window.location.href = "../auth/login.html";
      }
    });
  }

  async loadUserProfile() {
    try {
      const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));

      if (userDoc.exists()) {
        this.userProfile = userDoc.data();
        this.populateProfileForm();
        this.updateProfileSummary();
      } else {
        console.error("User profile not found");
        this.createDefaultProfile();
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      this.showError("Failed to load profile information");
    }
  }

  async createDefaultProfile() {
    try {
      const defaultProfile = {
        name:
          this.currentUser.displayName || this.currentUser.email.split("@")[0],
        email: this.currentUser.email,
        phone: "",
        location: "",
        bio: "",
        skills: [],
        interests: [],
        availability: {
          weekdays: false,
          weekends: false,
          evenings: false,
        },
        privacy: {
          profileVisible: true,
          showHours: true,
        },
        notifications: {
          emailOpportunities: true,
          emailUpdates: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "users", this.currentUser.uid), defaultProfile);
      this.userProfile = defaultProfile;
      this.populateProfileForm();
      this.updateProfileSummary();
    } catch (error) {
      console.error("Error creating default profile:", error);
    }
  }

  populateProfileForm() {
    if (!this.userProfile) return;

    // Basic Information
    document.getElementById("fullName").value = this.userProfile.name || "";
    document.getElementById("email").value = this.userProfile.email || "";
    document.getElementById("phone").value = this.userProfile.phone || "";
    document.getElementById("location").value = this.userProfile.location || "";
    document.getElementById("bio").value = this.userProfile.bio || "";

    // Skills and Interests
    document.getElementById("skills").value = (
      this.userProfile.skills || []
    ).join(", ");
    document.getElementById("interests").value = (
      this.userProfile.interests || []
    ).join(", ");

    // Availability
    if (this.userProfile.availability) {
      document.getElementById("weekdays").checked =
        this.userProfile.availability.weekdays || false;
      document.getElementById("weekends").checked =
        this.userProfile.availability.weekends || false;
      document.getElementById("evenings").checked =
        this.userProfile.availability.evenings || false;
    }

    // Privacy Settings
    if (this.userProfile.privacy) {
      document.getElementById("profileVisibility").checked =
        this.userProfile.privacy.profileVisible !== false;
      document.getElementById("showHours").checked =
        this.userProfile.privacy.showHours !== false;
    }

    // Notification Settings
    if (this.userProfile.notifications) {
      document.getElementById("emailOpportunities").checked =
        this.userProfile.notifications.emailOpportunities !== false;
      document.getElementById("emailUpdates").checked =
        this.userProfile.notifications.emailUpdates || false;
    }
  }

  updateProfileSummary() {
    if (!this.userProfile) return;

    document.getElementById("profileName").textContent =
      this.userProfile.name || "Anonymous User";
    document.getElementById("profileEmail").textContent =
      this.userProfile.email || "";

    // Member since date
    const memberSince = this.userProfile.createdAt;
    if (memberSince) {
      const date = memberSince.seconds
        ? new Date(memberSince.seconds * 1000)
        : new Date(memberSince);
      document.getElementById(
        "memberSince"
      ).textContent = `Member since ${date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })}`;
    }
  }

  async loadUserStats() {
    try {
      const applicationsQuery = query(
        collection(db, "applications"),
        where("userId", "==", this.currentUser.uid),
        where("status", "==", "completed")
      );

      const applicationsSnapshot = await getDocs(applicationsQuery);
      let totalHours = 0;
      const activitiesCount = applicationsSnapshot.size;

      applicationsSnapshot.forEach((doc) => {
        const application = doc.data();
        totalHours += application.hoursLogged || 0;
      });

      document.getElementById("profileTotalHours").textContent = totalHours;
      document.getElementById("profileActivities").textContent =
        activitiesCount;
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  }

  setupFormHandlers() {
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
      profileForm.addEventListener(
        "submit",
        this.handleProfileSubmit.bind(this)
      );
    }
  }

  async handleProfileSubmit(event) {
    event.preventDefault();

    try {
      // Collect form data
      const formData = {
        name: document.getElementById("fullName").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        location: document.getElementById("location").value.trim(),
        bio: document.getElementById("bio").value.trim(),
        skills: document
          .getElementById("skills")
          .value.split(",")
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0),
        interests: document
          .getElementById("interests")
          .value.split(",")
          .map((interest) => interest.trim())
          .filter((interest) => interest.length > 0),
        availability: {
          weekdays: document.getElementById("weekdays").checked,
          weekends: document.getElementById("weekends").checked,
          evenings: document.getElementById("evenings").checked,
        },
        updatedAt: new Date(),
      };

      // Validate required fields
      if (!formData.name || !formData.location) {
        this.showError(
          "Please fill in all required fields (Name and Location)"
        );
        return;
      }

      // Update user profile in Firestore
      await updateDoc(doc(db, "users", this.currentUser.uid), formData);

      // Update local profile data
      this.userProfile = { ...this.userProfile, ...formData };
      this.updateProfileSummary();

      // Show success message
      this.showSuccess();
    } catch (error) {
      console.error("Error updating profile:", error);
      this.showError("Failed to update profile. Please try again.");
    }
  }

  async savePrivacySettings() {
    try {
      const privacyData = {
        privacy: {
          profileVisible: document.getElementById("profileVisibility").checked,
          showHours: document.getElementById("showHours").checked,
        },
        notifications: {
          emailOpportunities:
            document.getElementById("emailOpportunities").checked,
          emailUpdates: document.getElementById("emailUpdates").checked,
        },
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "users", this.currentUser.uid), privacyData);
      this.userProfile = { ...this.userProfile, ...privacyData };

      // Show success feedback
      this.showToast("Privacy settings updated successfully!");
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      this.showError("Failed to update privacy settings. Please try again.");
    }
  }

  showSuccess() {
    const successModal = new bootstrap.Modal(
      document.getElementById("successModal")
    );
    successModal.show();
  }

  showError(message) {
    alert(`Error: ${message}`);
  }

  showToast(message) {
    // Simple toast notification
    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999;">
                <i class="bi bi-check-circle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }
}

// Initialize profile manager
document.addEventListener("DOMContentLoaded", () => {
  window.profileManager = new ProfileManager();
  window.profileManager.init();
});
