      let projects = [
        {
          name: "Portfolio Website",
          platforms: ["Web"],
          type: "Website",
          demoUrl: "https://davidkozdra.com",
          githubUrl: "https://github.com/DavidKozdra/davidkozdra.com",
          technologies: ["HTML", "CSS", "JavaScript"],
          people: ["David Kozdra"],
          startDate: "2020-04-22",
          endDate: "Never",
          image: "/assets/images/brand/favicon.webp",
          tag: "personal",
          description:
            "A personal portfolio website showcasing my background, skills, and featured work. That your currently on ? 😀🚀 ",
        },
        {
          name: "Real Time Stock Portal",
          platforms: ["Web"],
          type: "Website",
          demoUrl: "https://redchip.com/stocks",
          githubUrl: "",
          technologies: ["HTML", "CSS", "JavaScript", "PHP", "Python"],
          people: ["David Kozdra"],
          startDate: "2024-01",
          endDate: "2024-03",
          image: "/assets/images/projects/stock_portal.webp",
          tag: "work",
          description:
            "A real-time stock tracking and analysis portal developed for RedChip. With a 15 min deleyed Python data aggregation backend. Including tabled views of SEC filing data",
        },
        {
          name: "RedChat AI SEC summarizer",
          platforms: ["Web", "Android", "IOS"],
          type: "Website",
          demoUrl: "https://red.chat",
          githubUrl: "",
          technologies: ["HTML", "CSS", "React", "Python", "AWS"],
          people: ["David Kozdra"],
          startDate: "2024-01",
          endDate: "2025-01-15",
          image: "/assets/images/projects/red_chat.webp",
          tag: "work",
          description:
            "AI-powered chatbot to summarize SEC filings for quick insights. Loading storing and preparing over 100000 documents for every company on the NYSE and NASDAQ",
        },
        {
          name: "Florida Polycon Site",
          platforms: ["Web"],
          type: "Website",
          demoUrl: "",
          caseStudyUrl: "/pages/about/#florida-polycon",
          githubUrl: "",
          technologies: ["HTML", "CSS", "WordPress"],
          people: ["David Kozdra"],
          startDate: "2021-10",
          endDate: "2022-03",
          image: "/assets/images/company-logos/flpcon.webp",
          tag: "academic",
          description:
            "Conference website for Florida Polytechnic University’s annual event.",
        },
        {
          name: "Promo Mobile App",
          platforms: ["iOS", "Android"],
          type: "Mobile App",
          demoUrl: "",
          caseStudyUrl: "/work/promo-app/",
          githubUrl: "",
          technologies: ["CSS", "React Native", "React", "MongoDB", "Node.js"],
          people: [""],
          startDate: "2022-08",
          endDate: "2023-09",
          image: "/assets/images/company-logos/PromoSite.webp",
          tag: "work",
          description:
            "Cross-platform mobile app for discovering exclusive local business promotions.",
        },
        {
          name: "Holes Game",
          platforms: ["Web"],
          type: "Game",
          demoUrl: "https://muddygame.net/game/",
          githubUrl: "https://github.com/DavidKozdra/Holes_Client",
          technologies: [
            "HTML",
            "CSS",
            "JavaScript",
            "p5.js",
            "Socket.io",
            "AWS",
          ],
          people: ["David Kozdra", "Team"],
          startDate: "2024-05-20",
          endDate: "2026-01",
          image: "/assets/images/projects/holes.webp",
          tag: "personal",
          description:
            "A multiplayer sandbox browser game developed with vanilla JavaScript.",
        },
        {
          name: "GitPulse",
          platforms: ["Web"],
          type: "Tool",
          demoUrl:
            "https://chromewebstore.google.com/detail/gitpulse/fiamhceclfnbckgpnmpkhldgbdhiamhg",
          githubUrl: "https://github.com/DavidKozdra/GitPulse",
          technologies: ["HTML", "CSS", "JavaScript"],
          people: ["David Kozdra"],
          startDate: "2025-06-15",
          endDate: "Not yet",
          image: "/images/projects/gitpulse.webp",
          tag: "personal",
          description:
            "GitHub activity visualization tool for tracking repository metrics. Available on Chrome Web Store.",
        },
        {
          name: "Prompto",
          platforms: ["Web"],
          type: "Tool",
          demoUrl: "",
          githubUrl: "",
          technologies: ["HTML", "CSS", "JavaScript"],
          people: ["David Kozdra"],
          startDate: "2021-09",
          endDate: "2021-10",
          image: "/assets/images/projects/prompto.webp",
          tag: "personal",
          description:
            "Discord Bot for Prompts and poem making for creatives and artist projects.",
        },
        {
          name: "Cloudy Meadows Deluxe",
          platforms: ["Web"],
          type: "Game",
          demoUrl: "https://magentaautumn.itch.io/cloudy-meadows-deluxe",
          githubUrl: "https://github.com/DavidKozdra/Cloudy-Meadows-Deluxe",
          technologies: ["HTML", "CSS", "JavaScript", "p5.js"],
          people: ["David Kozdra"],
          startDate: "2026-01",
          endDate: "2026-01",
          image: "/assets/images/projects/cloudy_logo.webp",
          tag: "personal",
          description:
            "A farming RPG browser game developed with vanilla JavaScript and p5.js.",
        },
        {
          name: "Bargain Quest",
          platforms: ["Web"],
          type: "Game",
          demoUrl: "https://magentaautumn.itch.io/bargain-quest",
          githubUrl: "https://github.com/DavidKozdra/Bargain-Quest",
          technologies: ["HTML", "CSS", "JavaScript", "p5.js", "Koz_Engine"],
          people: ["David Kozdra"],
          startDate: "2025-09",
          endDate: "2026-03",
          image: "/assets/images/projects/bq_logo.png",
          tag: "personal",
          description:
            " Pirate themed sales game all about buying low and selling high. Developed with vanilla JavaScript and p5.js.",
        },
      ];

      let filters = {
        searchText: "",
        selectedTechnologies: [],
        selectedTags: [],
        selectedTypes: [],
        dateFrom: null,
        dateTo: null,
      };

      function normalizeProjectArray(value) {
        return Array.isArray(value) ? value.filter(Boolean) : [];
      }

      let allTechnologies = [
        ...new Set(
          projects.flatMap((p) => normalizeProjectArray(p.technologies)),
        ),
      ];
      let allTags = [...new Set(projects.map((p) => p.tag).filter(Boolean))];
      let allTypes = [...new Set(projects.map((p) => p.type).filter(Boolean))];

      const projectsContainer = document.getElementById("projects-container");
      const searchInput = document.getElementById("search-input");
      const techPillsDiv = document.getElementById("tech-pills");
      const tagPillsDiv = document.getElementById("tag-pills");
      const typePillsDiv = document.getElementById("type-pills");
      const dateFromInput = document.getElementById("date-from");
      const dateToInput = document.getElementById("date-to");
      const countLabel = document.getElementById("count-label");
      const toggleButton = document.getElementById("toggle-button");
      const toggleButtonLabel = document.getElementById("toggle-button-label");
      const filtersDiv = document.getElementById("filters");
      const activeFiltersDiv = document.getElementById("active-filters");
      const filterSummary = document.getElementById("filter-summary");

      function isMobileView() {
        return window.innerWidth <= 768;
      }

      function getActiveFilterCount() {
        let total = 0;
        total += filters.selectedTechnologies.length;
        total += filters.selectedTags.length;
        total += filters.selectedTypes.length;
        if (filters.dateFrom) total += 1;
        if (filters.dateTo) total += 1;
        if (filters.searchText.trim()) total += 1;
        return total;
      }

      function updateFilterSummary() {
        const activeCount = getActiveFilterCount();
        if (!activeCount) {
          filterSummary.textContent = isMobileView()
            ? "Filters hidden by default on mobile"
            : "Filters off";
          return;
        }

        filterSummary.textContent = `${activeCount} filter${activeCount === 1 ? "" : "s"} active`;
      }

      function setFiltersOpen(nextOpen) {
        isFiltersOpen = nextOpen;

        if (isFiltersOpen) {
          filtersDiv.classList.remove("collapsed");
          filtersDiv.classList.add("expanded");
          toggleButton.classList.remove("collapsed");
          toggleButtonLabel.textContent = "Hide Filters";
          toggleButton.setAttribute("aria-expanded", "true");
        } else {
          filtersDiv.classList.remove("expanded");
          filtersDiv.classList.add("collapsed");
          toggleButton.classList.add("collapsed");
          toggleButtonLabel.textContent = "Show Filters";
          toggleButton.setAttribute("aria-expanded", "false");
        }
      }

      function collapseFiltersOnMobile() {
        if (isMobileView()) {
          setFiltersOpen(false);
        }
      }

      function parseProjectDate(value) {
        if (!value) return null;
        const parsed = new Date(`${value}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }

      function getProjectStartDateValue(project) {
        return project.startDate || project.date || null;
      }

      function getProjectEndDateValue(project) {
        return project.endDate || null;
      }

      function getProjectStartDate(project) {
        return parseProjectDate(getProjectStartDateValue(project));
      }

      function getProjectEndDate(project) {
        return parseProjectDate(
          project.endDate || getProjectStartDateValue(project),
        );
      }

      function formatProjectDate(value) {
        if (!value) return null;

        if (/^\d{4}-\d{2}$/.test(value)) {
          const [year, month] = value.split("-").map(Number);
          const parsed = new Date(year, month - 1, 1);
          return parsed.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
          });
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const parsed = parseProjectDate(value);
          return parsed
            ? parsed.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : null;
        }

        return value;
      }

      function buildProjectDateText(project) {
        const startText = formatProjectDate(getProjectStartDateValue(project));
        const endText = formatProjectDate(getProjectEndDateValue(project));

        if (!project.startDate && !project.endDate && startText) {
          return `Date: ${startText}`;
        }

        const parts = [];
        if (startText) parts.push(`Start: ${startText}`);
        if (endText) parts.push(`Final: ${endText}`);
        return parts.join(" • ");
      }

      function appendProjectParagraph(parent, text) {
        if (!text) return;
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        parent.appendChild(paragraph);
      }

      function createPill(items, selectedArray, type) {
        const container =
          type === "tech"
            ? techPillsDiv
            : type === "tag"
              ? tagPillsDiv
              : typePillsDiv;

        items.forEach((item) => {
          const pill = document.createElement("div");
          pill.className = "filter-pill";
          pill.textContent = item;
          pill.dataset.value = item;
          pill.dataset.type = type;

          if (selectedArray.includes(item)) {
            pill.classList.add("active");
          }

          pill.addEventListener("click", () => togglePill(item, type));
          container.appendChild(pill);
        });
      }

      function togglePill(value, type) {
        const arrayKey =
          type === "tech"
            ? "selectedTechnologies"
            : type === "tag"
              ? "selectedTags"
              : "selectedTypes";
        const array = filters[arrayKey];

        if (array.includes(value)) {
          filters[arrayKey] = array.filter((item) => item !== value);
        } else {
          filters[arrayKey] = [...array, value];
        }

        updatePillStates();
        updateActiveFilters();
        applyFilters();
        collapseFiltersOnMobile();
      }

      function updatePillStates() {
        document.querySelectorAll(".filter-pill").forEach((pill) => {
          const type = pill.dataset.type;
          const value = pill.dataset.value;
          const arrayKey =
            type === "tech"
              ? "selectedTechnologies"
              : type === "tag"
                ? "selectedTags"
                : "selectedTypes";

          if (filters[arrayKey].includes(value)) {
            pill.classList.add("active");
          } else {
            pill.classList.remove("active");
          }
        });
      }

      function updateActiveFilters() {
        activeFiltersDiv.innerHTML = "";

        const allActive = [
          ...filters.selectedTechnologies.map((v) => ({
            value: v,
            type: "tech",
          })),
          ...filters.selectedTags.map((v) => ({ value: v, type: "tag" })),
          ...filters.selectedTypes.map((v) => ({ value: v, type: "type" })),
        ];

        allActive.forEach((filter) => {
          const pill = document.createElement("div");
          pill.className = "filter-pill active";
          pill.innerHTML = `
                    ${filter.value}
                    <span class="remove-btn" onclick="removeFilter('${filter.value}', '${filter.type}')">×</span>
                `;
          activeFiltersDiv.appendChild(pill);
        });

        updateFilterSummary();
      }

      function removeFilter(value, type) {
        event.stopPropagation();
        const arrayKey =
          type === "tech"
            ? "selectedTechnologies"
            : type === "tag"
              ? "selectedTags"
              : "selectedTypes";
        filters[arrayKey] = filters[arrayKey].filter((item) => item !== value);
        updatePillStates();
        updateActiveFilters();
        applyFilters();
        collapseFiltersOnMobile();
      }

      createPill(allTechnologies, filters.selectedTechnologies, "tech");
      createPill(allTags, filters.selectedTags, "tag");
      createPill(allTypes, filters.selectedTypes, "type");

      searchInput.addEventListener("input", () => {
        filters.searchText = searchInput.value;
        updateFilterSummary();
        applyFilters();
      });

      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          collapseFiltersOnMobile();
        }
      });

      dateFromInput.addEventListener("change", () => {
        filters.dateFrom = parseProjectDate(dateFromInput.value);
        updateFilterSummary();
        applyFilters();
        collapseFiltersOnMobile();
      });

      dateToInput.addEventListener("change", () => {
        filters.dateTo = parseProjectDate(dateToInput.value);
        updateFilterSummary();
        applyFilters();
        collapseFiltersOnMobile();
      });

      function applyFilters() {
        let filtered = projects.filter((project) => {
          if (filters.searchText) {
            const regex = new RegExp(filters.searchText, "i");
            const searchable = [
              project.name,
              project.type,
              normalizeProjectArray(project.platforms).join(" "),
              normalizeProjectArray(project.technologies).join(" "),
              normalizeProjectArray(project.people).join(" "),
            ].join(" ");
            if (!regex.test(searchable)) return false;
          }
          if (
            filters.selectedTechnologies.length &&
            !filters.selectedTechnologies.every((t) =>
              normalizeProjectArray(project.technologies).includes(t),
            )
          )
            return false;
          if (
            filters.selectedTags.length &&
            !filters.selectedTags.includes(project.tag)
          )
            return false;
          if (
            filters.selectedTypes.length &&
            !filters.selectedTypes.includes(project.type)
          )
            return false;
          const projectStartDate = getProjectStartDate(project);
          const projectEndDate = getProjectEndDate(project);
          if (
            filters.dateFrom &&
            projectEndDate &&
            projectEndDate < filters.dateFrom
          )
            return false;
          if (
            filters.dateTo &&
            projectStartDate &&
            projectStartDate > filters.dateTo
          )
            return false;
          return true;
        });
        countLabel.textContent = filtered.length;
        renderProjects(filtered);
      }

      function renderProjects(projectsToRender) {
        projectsContainer.innerHTML = "";
        if (!projectsToRender.length) {
          projectsContainer.textContent = "No projects match the filters.";
          return;
        }

        // Sort projects by end date (or start date if end date is missing), most recent first
        projectsToRender.sort((a, b) => {
          const aDate =
            getProjectEndDate(a) || getProjectStartDate(a) || new Date(0); // Treat projects with no dates as very old
          const bDate =
            getProjectEndDate(b) || getProjectStartDate(b) || new Date(0);
          return bDate - aDate;
        });

        projectsToRender.forEach((project) => {
          const projectDiv = document.createElement("div");
          projectDiv.classList.add("project");

          if (project.image) {
            const image = document.createElement("img");
            image.src = project.image;
            image.alt = `${project.name || "Project"} preview`;
            projectDiv.appendChild(image);
          }

          const content = document.createElement("div");
          content.classList.add("project-content");

          const name = document.createElement("h2");
          name.textContent = project.name;
          content.appendChild(name);

          appendProjectParagraph(content, project.type);
          appendProjectParagraph(content, buildProjectDateText(project));
          appendProjectParagraph(
            content,
            normalizeProjectArray(project.platforms).length
              ? `Platforms: ${normalizeProjectArray(project.platforms).join(", ")}`
              : "",
          );
          appendProjectParagraph(
            content,
            normalizeProjectArray(project.technologies).length
              ? `Technologies: ${normalizeProjectArray(project.technologies).join(", ")}`
              : "",
          );

          if (project.description) {
            appendProjectParagraph(content, project.description);
          }

          const links = document.createElement("p");
          if (project.caseStudyUrl) {
            const caseStudy = document.createElement("a");
            caseStudy.href = project.caseStudyUrl;
            caseStudy.textContent = "Project details";
            links.appendChild(caseStudy);
          }
          if (project.demoUrl) {
            if (links.childNodes.length)
              links.appendChild(document.createTextNode(" | "));
            const demo = document.createElement("a");
            demo.href = project.demoUrl;
            demo.textContent = "Demo";
            demo.target = "_blank";
            links.appendChild(demo);
          }
          if (project.githubUrl) {
            if (links.childNodes.length)
              links.appendChild(document.createTextNode(" | "));
            const github = document.createElement("a");
            github.href = project.githubUrl;
            github.textContent = "GitHub";
            github.target = "_blank";
            links.appendChild(github);
          }
          if (links.childNodes.length) {
            content.appendChild(links);
          }

          if (project.tag) {
            const tag = document.createElement("span");
            tag.className = `tag-badge tag-${project.tag}`;
            tag.textContent =
              project.tag.charAt(0).toUpperCase() + project.tag.slice(1);
            content.appendChild(tag);
          }

          projectDiv.appendChild(content);
          projectsContainer.appendChild(projectDiv);
        });
      }

      function resetFilters() {
        filters = {
          searchText: "",
          selectedTechnologies: [],
          selectedTags: [],
          selectedTypes: [],
          dateFrom: null,
          dateTo: null,
        };
        searchInput.value = "";
        dateFromInput.value = "";
        dateToInput.value = "";
        updatePillStates();
        updateActiveFilters();
        applyFilters();
        collapseFiltersOnMobile();
      }

      let isFiltersOpen = !isMobileView();

      function toggleDropDown() {
        setFiltersOpen(!isFiltersOpen);
      }

      setFiltersOpen(isFiltersOpen);
      updateFilterSummary();
      applyFilters();
    
