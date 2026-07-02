/* ==========================================================================
   LNB
   ========================================================================== */

const LNB_SELECTORS = {
	open: ".bdu-button--lnb-open",
	close: ".bdu-button--lnb-close",
	lnb: ".bdu-lnb",
	overlay: ".bdu-lnb-overlay",
};

const OVERLAY_HIDE_DELAY = 250;

/** @type {WeakMap<Document | Element, () => void>} */
const closeHandlers = new WeakMap();

function closeLnb(root = document) {
	closeHandlers.get(root)?.();
}

function initLnb(root = document) {
	const openBtn = root.querySelector(LNB_SELECTORS.open);
	const closeBtn = root.querySelector(LNB_SELECTORS.close);
	const lnb = root.querySelector(LNB_SELECTORS.lnb);
	const overlay = root.querySelector(LNB_SELECTORS.overlay);

	if (!openBtn || !closeBtn || !lnb || !overlay) {
		return;
	}

	function updateOpenButtonState(isOpen) {
		openBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
	}

	function openMenu() {
		if (lnb.classList.contains("bdu-is-open")) {
			return;
		}

		lnb.classList.add("bdu-is-open");
		overlay.hidden = false;
		requestAnimationFrame(() => overlay.classList.add("bdu-is-open"));
		updateOpenButtonState(true);
		closeBtn.focus();
	}

	function closeMenu() {
		lnb.classList.remove("bdu-is-open");
		overlay.classList.remove("bdu-is-open");
		updateOpenButtonState(false);

		setTimeout(() => {
			overlay.hidden = true;
		}, OVERLAY_HIDE_DELAY);

		openBtn.focus();
	}

	openBtn.addEventListener("click", openMenu);

	closeBtn.addEventListener("click", closeMenu);
	overlay.addEventListener("click", closeMenu);

	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && lnb.classList.contains("bdu-is-open")) {
			closeMenu();
		}
	});

	closeHandlers.set(root, closeMenu);
}

/* ==========================================================================
   Accordion (LNB)
   ========================================================================== */

const ACCORDION_SELECTOR = ".bdu-menu-item--accordion";

function initAccordion(root = document) {
	const accordionItems = root.querySelectorAll(ACCORDION_SELECTOR);

	accordionItems.forEach((item) => {
		const btn = item.querySelector(".bdu-menu-accordion-btn");
		const submenu = item.querySelector(".bdu-menu-submenu");

		if (!btn || !submenu) {
			return;
		}

		btn.addEventListener("click", () => {
			const isOpen = item.classList.contains("bdu-is-open");

			if (isOpen) {
				item.classList.remove("bdu-is-open");
				btn.setAttribute("aria-expanded", "false");
				submenu.hidden = true;
			} else {
				item.classList.add("bdu-is-open");
				btn.setAttribute("aria-expanded", "true");
				submenu.hidden = false;
			}
		});
	});
}

/* ==========================================================================
   Quiz tabs
   ========================================================================== */

const QUIZ_SECTION_SELECTOR = ".page-0008";

/** @type {WeakMap<Document | Element, (index: number) => void>} */
const activateHandlers = new WeakMap();

function activateQuizTab(index, root = document) {
	activateHandlers.get(root)?.(index);
}

function initQuizTabs(root = document) {
	const section = root.querySelector(QUIZ_SECTION_SELECTOR);
	if (!section) {
		return;
	}

	const tabs = section.querySelectorAll('[role="tab"]');
	const panels = section.querySelectorAll('[role="tabpanel"]');

	if (!tabs.length || !panels.length) {
		return;
	}

	function activateTab(index) {
		tabs.forEach((tab, i) => {
			const isActive = i === index;
			tab.classList.toggle("bdu-is-active", isActive);
			tab.setAttribute("aria-selected", isActive ? "true" : "false");
			tab.tabIndex = isActive ? 0 : -1;
		});

		panels.forEach((panel, i) => {
			const isActive = i === index;
			panel.classList.toggle("bdu-is-active", isActive);
			panel.hidden = !isActive;
		});

		root.dispatchEvent(
			new CustomEvent("bdu:quiz-tab-change", {
				bubbles: true,
				detail: { index },
			})
		);
	}

	tabs.forEach((tab, index) => {
		tab.addEventListener("click", () => activateTab(index));

		tab.addEventListener("keydown", (event) => {
			let nextIndex = index;

			if (event.key === "ArrowRight") {
				nextIndex = (index + 1) % tabs.length;
			} else if (event.key === "ArrowLeft") {
				nextIndex = (index - 1 + tabs.length) % tabs.length;
			} else {
				return;
			}

			event.preventDefault();
			activateTab(nextIndex);
			tabs[nextIndex].focus();
		});
	});

	activateHandlers.set(root, activateTab);
}

/* ==========================================================================
   Quiz modal
   ========================================================================== */

/**
 * @param {HTMLElement} panel
 * @returns {{ open: Function, openFromPanel: Function, close: Function, destroy: Function } | null}
 */
function bindQuizModal(panel) {
	const modal = panel.querySelector(".bdu-quiz-modal");
	if (!modal) {
		return null;
	}

	const answerValue = modal.querySelector(".bdu-quiz-modal__answer-value");
	const explainText = modal.querySelector(".bdu-quiz-modal__explain-text");
	const overlay = modal.querySelector(".bdu-quiz-modal__overlay");
	const closeButtons = modal.querySelectorAll("[data-quiz-modal-close]");

	let lastFocused = null;

	function open(answer, explain) {
		if (answerValue) {
			const isOx = /^[ox]$/i.test(answer);
			answerValue.textContent = isOx ? answer.toUpperCase() : answer;
		}
		if (explainText) {
			explainText.textContent = explain;
		}

		lastFocused = document.activeElement;
		modal.hidden = false;
		requestAnimationFrame(() => modal.classList.add("bdu-is-open"));
		modal.querySelector(".bdu-quiz-modal__close")?.focus();
	}

	function openFromPanel() {
		const answer = panel.dataset.quizAnswer || "";
		const explain = panel.dataset.quizExplain || "";
		open(answer, explain);
	}

	function close() {
		modal.classList.remove("bdu-is-open");

		setTimeout(() => {
			modal.hidden = true;
			lastFocused?.focus();
			lastFocused = null;
		}, 200);
	}

	closeButtons.forEach((btn) => {
		btn.addEventListener("click", close);
	});

	overlay?.addEventListener("click", close);

	const onKeydown = (event) => {
		if (event.key === "Escape" && !modal.hidden) {
			close();
		}
	};

	window.addEventListener("keydown", onKeydown);

	return {
		open,
		openFromPanel,
		close,
		destroy() {
			window.removeEventListener("keydown", onKeydown);
		},
	};
}

/* ==========================================================================
   Quiz notice modal (정답 선택/입력 전 안내)
   ========================================================================== */

/** @type {WeakMap<Document | Element, ReturnType<typeof bindNoticeModal>>} */
const noticeModalCache = new WeakMap();

/**
 * @param {Document | Element} root
 * @returns {{ open: Function, close: Function } | null}
 */
function bindNoticeModal(root = document) {
	if (noticeModalCache.has(root)) {
		return noticeModalCache.get(root);
	}

	const section = root.querySelector(QUIZ_SECTION_SELECTOR);
	const modal = section?.querySelector(".bdu-notice-modal");
	if (!modal) {
		noticeModalCache.set(root, null);
		return null;
	}

	const messageEl = modal.querySelector(".bdu-notice-modal__message");
	const overlay = modal.querySelector(".bdu-notice-modal__overlay");
	const closeButtons = modal.querySelectorAll("[data-notice-modal-close]");

	let lastFocused = null;

	function open(message) {
		if (messageEl) {
			messageEl.textContent = message;
		}

		lastFocused = document.activeElement;
		modal.hidden = false;
		requestAnimationFrame(() => modal.classList.add("bdu-is-open"));
		modal.querySelector(".bdu-notice-modal__close")?.focus();
	}

	function close() {
		modal.classList.remove("bdu-is-open");

		setTimeout(() => {
			modal.hidden = true;
			lastFocused?.focus();
			lastFocused = null;
		}, 200);
	}

	closeButtons.forEach((btn) => {
		btn.addEventListener("click", close);
	});

	overlay?.addEventListener("click", close);

	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && !modal.hidden) {
			close();
		}
	});

	const api = { open, close };
	noticeModalCache.set(root, api);
	return api;
}

/**
 * 문항 유형별로 사용자가 아직 응답하지 않았는지 확인한다.
 * @param {HTMLElement} panel
 * @returns {boolean}
 */
function hasAnswered(panel) {
	const radios = panel.querySelectorAll('input[type="radio"]');
	if (radios.length) {
		return Array.from(radios).some((radio) => radio.checked);
	}

	const textField = panel.querySelector(
		".bdu-quiz-blank__input, .bdu-quiz-subjective__textarea"
	);
	if (textField) {
		return textField.value.trim().length > 0;
	}

	return true;
}

function getUnansweredMessage(panel) {
	if (panel.querySelector('input[type="radio"]')) {
		return "정답을 선택하세요";
	}
	return "정답을 입력하세요";
}

/* ==========================================================================
   Quiz answer
   ========================================================================== */

function initQuizAnswer(root = document) {
	const section = root.querySelector(QUIZ_SECTION_SELECTOR);
	if (!section) {
		return;
	}

	const noticeModalApi = bindNoticeModal(root);

	const panels = section.querySelectorAll(
		".bdu-quiz-panel:not(.bdu-quiz-panel--match)"
	);

	panels.forEach((panel) => {
		const modalApi = bindQuizModal(panel);
		if (!modalApi) {
			return;
		}

		function attemptOpenAnswer() {
			if (!hasAnswered(panel)) {
				noticeModalApi?.open(getUnansweredMessage(panel));
				return;
			}
			modalApi.openFromPanel();
		}

		const checkBtn = panel.querySelector(".bdu-button--check");
		checkBtn?.addEventListener("click", attemptOpenAnswer);

		panel.querySelectorAll(".bdu-quiz-blank__input").forEach((input) => {
			input.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					attemptOpenAnswer();
				}
			});
		});
	});
}

/* ==========================================================================
   Quiz match
   ========================================================================== */

const MATCH_PANEL_SELECTOR = ".bdu-quiz-panel--match";

const LINE_COLORS = {
	1: "#d66325",
	2: "#003d80",
	3: "#1387a4",
};

const CORRECT_PAIRS = {
	1: "c",
	2: "b",
	3: "a",
};

function initQuizMatch(root = document) {
	const section = root.querySelector(QUIZ_SECTION_SELECTOR);
	const panel = section?.querySelector(MATCH_PANEL_SELECTOR);
	if (!section || !panel) {
		return;
	}

	const board = panel.querySelector(".bdu-quiz-match__board");
	const canvas = panel.querySelector(".bdu-quiz-match__canvas");
	if (!board || !canvas) {
		return;
	}

	const ctx = canvas.getContext("2d");
	const leftNodes = panel.querySelectorAll('[data-match-side="left"]');
	const rightNodes = panel.querySelectorAll('[data-match-side="right"]');
	const checkBtn = panel.querySelector(".bdu-button--check");
	const resetBtn = panel.querySelector("[data-quiz-match-reset]");
	const modalApi = bindQuizModal(panel);
	const noticeModalApi = bindNoticeModal(root);

	/** @type {Map<string, { rightId: string, color: string }>} */
	const connections = new Map();
	let dragging = null;

	function getBoardPoint(clientX, clientY) {
		const boardRect = board.getBoundingClientRect();
		return {
			x: clientX - boardRect.left,
			y: clientY - boardRect.top,
		};
	}

	function getPointer(event) {
		if (event.touches && event.touches.length) {
			return getBoardPoint(event.touches[0].clientX, event.touches[0].clientY);
		}
		return getBoardPoint(event.clientX, event.clientY);
	}

	function getNodeCenter(node) {
		const boardRect = board.getBoundingClientRect();
		const nodeRect = node.getBoundingClientRect();
		return {
			x: nodeRect.left + nodeRect.width / 2 - boardRect.left,
			y: nodeRect.top + nodeRect.height / 2 - boardRect.top,
		};
	}

	function drawLine(from, to, color, dashed = false) {
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.lineCap = "round";
		ctx.setLineDash(dashed ? [6, 4] : []);
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	function draw() {
		const rect = board.getBoundingClientRect();
		ctx.clearRect(0, 0, rect.width, rect.height);

		connections.forEach((conn, leftId) => {
			const leftNode = panel.querySelector(
				`[data-match-side="left"][data-match-id="${leftId}"]`
			);
			const rightNode = panel.querySelector(
				`[data-match-side="right"][data-match-id="${conn.rightId}"]`
			);
			if (leftNode && rightNode) {
				drawLine(getNodeCenter(leftNode), getNodeCenter(rightNode), conn.color);
			}
		});

		if (dragging) {
			drawLine(
				getNodeCenter(dragging.fromNode),
				{ x: dragging.currentX, y: dragging.currentY },
				"#999",
				true
			);
		}
	}

	function resizeCanvas() {
		const rect = board.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.floor(rect.width * dpr);
		canvas.height = Math.floor(rect.height * dpr);
		canvas.style.width = `${rect.width}px`;
		canvas.style.height = `${rect.height}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		draw();
	}

	function findRightNodeAt(x, y) {
		for (const node of rightNodes) {
			const center = getNodeCenter(node);
			if (Math.hypot(center.x - x, center.y - y) < 36) {
				return node;
			}
		}
		return null;
	}

	function startDrag(node, event) {
		event.preventDefault();
		const point = getPointer(event);
		dragging = {
			fromNode: node,
			fromId: node.dataset.matchId,
			currentX: point.x,
			currentY: point.y,
		};
		node.classList.add("bdu-is-active");
		draw();
	}

	function onMove(event) {
		if (!dragging) {
			return;
		}
		event.preventDefault();
		const point = getPointer(event);
		dragging.currentX = point.x;
		dragging.currentY = point.y;
		draw();
	}

	function clearNodeVisual(node) {
		node.classList.remove("bdu-quiz-match__node--connected");
		node.style.removeProperty("--match-color");
	}

	function applyNodeVisual(node, color) {
		node.classList.add("bdu-quiz-match__node--connected");
		node.style.setProperty("--match-color", color);
	}

	function updateNodeVisuals() {
		leftNodes.forEach((node) => clearNodeVisual(node));
		rightNodes.forEach((node) => clearNodeVisual(node));
		connections.forEach((conn, leftId) => {
			const leftNode = panel.querySelector(
				`[data-match-side="left"][data-match-id="${leftId}"]`
			);
			const rightNode = panel.querySelector(
				`[data-match-side="right"][data-match-id="${conn.rightId}"]`
			);
			if (leftNode) {
				applyNodeVisual(leftNode, conn.color);
			}
			if (rightNode) {
				applyNodeVisual(rightNode, conn.color);
			}
		});
	}

	function endDrag(event) {
		if (!dragging) {
			return;
		}

		let point;
		if (event.changedTouches && event.changedTouches.length) {
			point = getBoardPoint(
				event.changedTouches[0].clientX,
				event.changedTouches[0].clientY
			);
		} else {
			point = getPointer(event);
		}

		const target = findRightNodeAt(point.x, point.y);
		if (target) {
			const rightId = target.dataset.matchId;
			connections.forEach((conn, leftId) => {
				if (conn.rightId === rightId && leftId !== dragging.fromId) {
					connections.delete(leftId);
				}
			});
			connections.set(dragging.fromId, {
				rightId,
				color: LINE_COLORS[dragging.fromId] || "#333",
			});
		}

		dragging.fromNode.classList.remove("bdu-is-active");
		dragging = null;
		updateNodeVisuals();
		draw();
	}

	function resetMatches() {
		connections.clear();
		updateNodeVisuals();
		draw();
	}

	function validateAndShowAnswer() {
		if (!modalApi) {
			return;
		}

		if (connections.size === 0) {
			noticeModalApi?.open("정답을 선택하세요");
			return;
		}

		const required = Object.keys(CORRECT_PAIRS);
		const allConnected = required.every((id) => connections.has(id));
		let allCorrect = allConnected;

		if (allConnected) {
			required.forEach((leftId) => {
				if (connections.get(leftId)?.rightId !== CORRECT_PAIRS[leftId]) {
					allCorrect = false;
				}
			});
		} else {
			allCorrect = false;
		}

		const answer = allCorrect ? "모두 정답" : "다시 확인해 보세요";
		const explain =
			panel.dataset.quizExplain ||
			"1. 전화 — C. 알렉산더 그레이엄 벨 / 2. 전구 — B. 토머스 에디슨 / 3. 비행기 — A. 라이트 형제";

		modalApi.open(answer, explain);
	}

	leftNodes.forEach((node) => {
		node.addEventListener("mousedown", (event) => startDrag(node, event));
		node.addEventListener("touchstart", (event) => startDrag(node, event), {
			passive: false,
		});
	});

	window.addEventListener("mousemove", onMove);
	window.addEventListener("mouseup", endDrag);
	window.addEventListener("touchmove", onMove, { passive: false });
	window.addEventListener("touchend", endDrag);
	window.addEventListener("touchcancel", endDrag);

	checkBtn?.addEventListener("click", validateAndShowAnswer);
	resetBtn?.addEventListener("click", resetMatches);

	const resizeObserver = new ResizeObserver(() => resizeCanvas());
	resizeObserver.observe(board);

	window.addEventListener("resize", resizeCanvas);

	const tabBtn = section.querySelector("#quiz-tab-5");
	tabBtn?.addEventListener("click", () => {
		requestAnimationFrame(resizeCanvas);
	});
}

/* ==========================================================================
   Diagnosis
   ========================================================================== */

const DIAGNOSIS_SECTION_SELECTOR = ".page-0001";

function initDiagnosis(root = document) {
	const section = root.querySelector(DIAGNOSIS_SECTION_SELECTOR);
	if (!section) {
		return;
	}

	const form = section.querySelector(".bdu-diagnosis__form");
	const resultBox = section.querySelector(".bdu-diagnosis-result");
	const scoreEl = section.querySelector(".bdu-diagnosis-result__score");
	const resultBtn = section.querySelector(".bdu-button--result");

	if (!form || !resultBox || !scoreEl || !resultBtn) {
		return;
	}

	const radios = form.querySelectorAll('input[type="radio"]');
	const totalCount = new Set([...radios].map((input) => input.name)).size;

	resultBtn.addEventListener("click", () => {
		const selected = form.querySelectorAll('input[type="radio"]:checked');
		const answeredCount = selected.length;

		if (answeredCount < totalCount) {
			const remain = totalCount - answeredCount;
			alert(`모든 항목에 체크해 주세요. (미응답 ${remain}개)`);
			return;
		}

		let sum = 0;
		selected.forEach((input) => {
			sum += Number(input.value);
		});

		scoreEl.textContent = String(sum);
		resultBox.hidden = false;
		resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
	});
}

/* ==========================================================================
   Page navigation
   ========================================================================== */

const PAGE_SECTION_SELECTOR = ".bdu-page > section.bdu-section[class*='page-']";
const NAV_LINK_SELECTOR = "[data-bdu-page]";

/**
 * @param {string} pageId
 * @param {number | null} quizTabIndex
 */
function setActiveNav(root, pageId, quizTabIndex = null) {
	const links = root.querySelectorAll(NAV_LINK_SELECTOR);

	links.forEach((link) => {
		const linkPage = link.dataset.bduPage;
		const linkTab = link.dataset.bduQuizTab;
		const isPageMatch = linkPage === pageId;
		const isTabMatch =
			quizTabIndex === null || linkTab === undefined || linkTab === String(quizTabIndex);
		link.classList.toggle("bdu-is-active", isPageMatch && isTabMatch);
	});

	root.querySelectorAll(".bdu-menu-item").forEach((item) => {
		const directLink = item.querySelector(":scope > a[data-bdu-page]");
		const accordionBtn = item.querySelector(":scope > .bdu-menu-accordion-btn");
		const submenuLinks = item.querySelectorAll(".bdu-menu-submenu a[data-bdu-page]");

		let isActive = false;

		if (directLink?.dataset.bduPage === pageId) {
			isActive = quizTabIndex === null || !directLink.dataset.bduQuizTab;
		}

		if (!isActive && submenuLinks.length) {
			isActive = Array.from(submenuLinks).some((link) => {
				if (link.dataset.bduPage !== pageId) {
					return false;
				}
				if (quizTabIndex === null) {
					return true;
				}
				return link.dataset.bduQuizTab === String(quizTabIndex);
			});
		}

		item.classList.toggle("bdu-is-active", isActive);
		item.classList.toggle("bdu-menu-item--highlight", isActive);

		if (isActive && accordionBtn && submenuLinks.length) {
			const submenu = item.querySelector(".bdu-menu-submenu");
			item.classList.add("bdu-is-open");
			accordionBtn.setAttribute("aria-expanded", "true");
			if (submenu) {
				submenu.hidden = false;
			}
		}
	});
}

/**
 * @param {string} pageId
 * @param {{ quizTab?: number | null, closeMenu?: boolean }} [options]
 */
function showPage(root, pageId, options = {}) {
	const { quizTab = null, closeMenu = true } = options;
	const sections = root.querySelectorAll(PAGE_SECTION_SELECTOR);

	sections.forEach((section) => {
		const isActive = section.classList.contains(pageId);
		section.classList.toggle("bdu-is-active", isActive);
		section.hidden = !isActive;
	});

	if (pageId === "page-0008" && quizTab !== null) {
		activateQuizTab(quizTab, root);
	}

	setActiveNav(root, pageId, quizTab);

	if (closeMenu) {
		closeLnb(root);
	}

	const activeSection = root.querySelector(`.${pageId}.bdu-is-active`);
	activeSection?.scrollIntoView({ block: "start" });
}

function initPageNav(root = document) {
	const sections = root.querySelectorAll(PAGE_SECTION_SELECTOR);
	const navLinks = root.querySelectorAll(NAV_LINK_SELECTOR);

	if (!sections.length) {
		return;
	}

	const defaultPage = "page-0001";

	sections.forEach((section) => {
		section.classList.remove("bdu-is-active");
		section.hidden = true;
	});

	showPage(root, defaultPage, { closeMenu: false });

	navLinks.forEach((link) => {
		link.addEventListener("click", (event) => {
			event.preventDefault();
			const pageId = link.dataset.bduPage;
			if (!pageId) {
				return;
			}

			const tabRaw = link.dataset.bduQuizTab;
			const quizTab = tabRaw !== undefined ? Number(tabRaw) : null;

			showPage(root, pageId, {
				quizTab: Number.isNaN(quizTab) ? null : quizTab,
			});
		});
	});

	root.addEventListener("bdu:quiz-tab-change", (event) => {
		const section = root.querySelector(".page-0008.bdu-is-active");
		if (!section) {
			return;
		}
		setActiveNav(root, "page-0008", event.detail.index);
	});
}

/* ==========================================================================
   Sound (intro TTS)
   ========================================================================== */

/** @type {WeakMap<HTMLButtonElement, HTMLAudioElement>} */
const soundPlayers = new WeakMap();

function setSoundBtnPlaying(btn, isPlaying) {
	btn.classList.toggle("bdu-is-playing", isPlaying);
	btn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
	btn.setAttribute(
		"aria-label",
		isPlaying ? "음성 일시정지" : btn.dataset.soundLabelIdle || "음성 재생"
	);
}

function initSound(root = document) {
	root.querySelectorAll(".bdu-button[data-bdu-sound]").forEach((btn) => {
		const src = btn.dataset.bduSound;
		if (!src) {
			return;
		}

		btn.dataset.soundLabelIdle =
			btn.getAttribute("aria-label") || "음성 재생";

		const audio = new Audio(src);
		soundPlayers.set(btn, audio);

		btn.addEventListener("click", async () => {
			try {
				if (audio.paused) {
					audio.currentTime = 0;
					await audio.play();
					setSoundBtnPlaying(btn, true);
				} else {
					audio.pause();
					setSoundBtnPlaying(btn, false);
				}
			} catch {
				setSoundBtnPlaying(btn, false);
			}
		});

		audio.addEventListener("ended", () => {
			setSoundBtnPlaying(btn, false);
		});

		audio.addEventListener("pause", () => {
			if (audio.ended) {
				return;
			}
			setSoundBtnPlaying(btn, false);
		});
	});
}

/* ==========================================================================
   Init
   ========================================================================== */

function init() {
	initLnb();
	initAccordion();
	initQuizTabs();
	initQuizAnswer();
	initQuizMatch();
	initDiagnosis();
	initPageNav();
	initSound();
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
