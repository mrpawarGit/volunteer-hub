import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let allOpportunities = [];
let filteredOpportunities = [];

// Load opportunities on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadOpportunities();
  displayOpportunities(allOpportunities);
});

async function loadOpportunities() {
  try {
    const q = query(
      collection(db, "opportunities"),
      where("status", "==", "active"),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    allOpportunities = [];

    querySnapshot.forEach((doc) => {
      allOpportunities.push({ id: doc.id, ...doc.data() });
    });

    filteredOpportunities = [...allOpportunities];
  } catch (error) {
    console.error("Error loading opportunities:", error);
    // If no opportunities exist, create some sample data
    createSampleOpportunities();
  }
}

// Create sample opportunities if none exist
async function createSampleOpportunities() {
  const sampleOpportunities = [
    {
      title: "Community Garden Volunteer",
      description:
        "Help maintain our community garden by watering plants, weeding, and harvesting vegetables for local food banks.",
      organization: "Green Community Initiative",
      location: "Downtown Community Center",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      duration: 4,
      skillsRequired: ["Gardening", "Physical Labor"],
      category: "environment",
      maxVolunteers: 10,
      currentVolunteers: [],
      status: "active",
      additionalInfo:
        "Please bring gardening gloves and wear comfortable clothes.",
    },
    {
      title: "Reading Tutor for Children",
      description:
        "Help elementary school children improve their reading skills through one-on-one tutoring sessions.",
      organization: "Local Library Foundation",
      location: "Central Public Library",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      duration: 3,
      skillsRequired: ["Teaching", "Patience", "Communication"],
      category: "education",
      maxVolunteers: 8,
      currentVolunteers: [],
      status: "active",
      additionalInfo: "Background check required. Training session provided.",
    },
    {
      title: "Food Bank Sorting",
      description:
        "Sort and organize donated food items to prepare meal packages for families in need.",
      organization: "City Food Bank",
      location: "Food Bank Warehouse",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      duration: 2,
      skillsRequired: ["Organization", "Attention to Detail"],
      category: "community",
      maxVolunteers: 15,
      currentVolunteers: [],
      status: "active",
      additionalInfo: "All ages welcome. Refreshments provided.",
    },
  ];

  try {
    for (const opportunity of sampleOpportunities) {
      await addDoc(collection(db, "opportunities"), opportunity);
    }
    allOpportunities = sampleOpportunities;
    filteredOpportunities = [...allOpportunities];
    displayOpportunities(allOpportunities);
  } catch (error) {
    console.error("Error creating sample opportunities:", error);
  }
}

function displayOpportunities(opportunities) {
  const container = document.getElementById("opportunitiesContainer");
  const loadingSpinner = document.getElementById("loadingSpinner");

  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }

  if (opportunities.length === 0) {
    container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-search display-1 text-muted"></i>
                    <h3 class="mt-3">No opportunities found</h3>
                    <p class="text-muted">Try adjusting your filters or search criteria</p>
                </div>
            </div>
        `;
    return;
  }

  container.innerHTML = opportunities
    .map(
      (opportunity) => `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm opportunity-card" data-id="${
              opportunity.id
            }">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-primary">${
                          opportunity.category
                        }</span>
                        <small class="text-muted">${formatDate(
                          opportunity.date
                        )}</small>
                    </div>
                    
                    <h5 class="card-title">${opportunity.title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${
                      opportunity.organization
                    }</h6>
                    <p class="card-text text-truncate">${
                      opportunity.description
                    }</p>
                    
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="bi bi-geo-alt"></i> ${
                              opportunity.location
                            }
                        </small>
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="bi bi-clock"></i> ${
                              opportunity.duration
                            } hours
                        </small>
                    </div>
                    
                    <div class="mb-3">
                        <small class="text-muted">
                            <i class="bi bi-people"></i> ${
                              opportunity.currentVolunteers?.length || 0
                            }/${opportunity.maxVolunteers} volunteers
                        </small>
                    </div>
                    
                    <button class="btn btn-primary w-100" onclick="showOpportunityDetails('${
                      opportunity.id
                    }')">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// Show opportunity details in modal
window.showOpportunityDetails = async (opportunityId) => {
  try {
    const opportunity = allOpportunities.find(
      (opp) => opp.id === opportunityId
    );
    if (!opportunity) return;

    const modal = new bootstrap.Modal(
      document.getElementById("opportunityModal")
    );
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const applyButton = document.getElementById("applyButton");

    modalTitle.textContent = opportunity.title;
    modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6>Organization</h6>
                    <p>${opportunity.organization}</p>
                    
                    <h6>Description</h6>
                    <p>${opportunity.description}</p>
                    
                    <h6>Skills Required</h6>
                    <div class="mb-3">
                        ${
                          opportunity.skillsRequired
                            ?.map(
                              (skill) =>
                                `<span class="badge bg-secondary me-1">${skill}</span>`
                            )
                            .join("") || "No specific skills required"
                        }
                    </div>
                    
                    <h6>Additional Information</h6>
                    <p>${
                      opportunity.additionalInfo ||
                      "No additional information provided."
                    }</p>
                </div>
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body">
                            <h6>Event Details</h6>
                            <p><i class="bi bi-calendar"></i> ${formatDate(
                              opportunity.date
                            )}</p>
                            <p><i class="bi bi-clock"></i> ${
                              opportunity.duration
                            } hours</p>
                            <p><i class="bi bi-geo-alt"></i> ${
                              opportunity.location
                            }</p>
                            <p><i class="bi bi-people"></i> ${
                              opportunity.currentVolunteers?.length || 0
                            }/${opportunity.maxVolunteers} volunteers</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    applyButton.onclick = () => applyForOpportunity(opportunityId);
    modal.show();
  } catch (error) {
    console.error("Error loading opportunity details:", error);
  }
};

// Apply for opportunity
async function applyForOpportunity(opportunityId) {
  if (!auth.currentUser) {
    alert("Please login to apply for opportunities");
    window.location.href = "../auth/login.html";
    return;
  }

  try {
    await addDoc(collection(db, "applications"), {
      userId: auth.currentUser.uid,
      opportunityId: opportunityId,
      status: "pending",
      appliedAt: new Date(),
      hoursLogged: 0,
    });

    alert("Application submitted successfully!");
    bootstrap.Modal.getInstance(
      document.getElementById("opportunityModal")
    ).hide();
  } catch (error) {
    console.error("Error applying for opportunity:", error);
    alert("Error submitting application. Please try again.");
  }
}

// Search functionality
window.searchOpportunities = () => {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();

  if (searchTerm === "") {
    displayOpportunities(filteredOpportunities);
    return;
  }

  const searchResults = filteredOpportunities.filter(
    (opportunity) =>
      opportunity.title.toLowerCase().includes(searchTerm) ||
      opportunity.description.toLowerCase().includes(searchTerm) ||
      opportunity.organization.toLowerCase().includes(searchTerm) ||
      opportunity.location.toLowerCase().includes(searchTerm)
  );

  displayOpportunities(searchResults);
};

// Filter functionality
window.applyFilters = () => {
  const category = document.getElementById("categoryFilter").value;
  const location = document
    .getElementById("locationFilter")
    .value.toLowerCase();
  const date = document.getElementById("dateFilter").value;

  filteredOpportunities = allOpportunities.filter((opportunity) => {
    let matches = true;

    if (category && opportunity.category !== category) {
      matches = false;
    }

    if (location && !opportunity.location.toLowerCase().includes(location)) {
      matches = false;
    }

    if (date) {
      const oppDate =
        opportunity.date instanceof Date
          ? opportunity.date.toISOString().split("T")[0]
          : new Date(opportunity.date.seconds * 1000)
              .toISOString()
              .split("T")[0];
      if (oppDate !== date) {
        matches = false;
      }
    }

    return matches;
  });

  displayOpportunities(filteredOpportunities);
};

window.clearFilters = () => {
  document.getElementById("categoryFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("dateFilter").value = "";
  document.getElementById("searchInput").value = "";

  filteredOpportunities = [...allOpportunities];
  displayOpportunities(filteredOpportunities);
};

// Utility function
function formatDate(date) {
  if (!date) return "Date TBD";

  const dateObj =
    date instanceof Date
      ? date
      : date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);

  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
