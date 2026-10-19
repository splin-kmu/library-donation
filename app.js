
function render() {
  const query = normalise($("search").value);
  const statusFilter = $("statusFilter").value;
  const langFilter = $("languageFilter").value;
  const classificationFilter = $("classificationFilter").value;

  const filtered = allBooks.filter(book => {
    const searchable = [
      book.title,
      book.author,
      book.barcode,
      book.language,
      book.call_number,
      book.classification,
      book.location
    ].map(normalise).join(" ");

    const matchesQuery = searchable.includes(query);
    const matchesStatus =
      statusFilter === "all" || book.status === statusFilter;

    const code = languageCode(book.language);
    const matchesLanguage =
      langFilter === "all" || code === langFilter;

    const matchesClassification =
      classificationFilter === "all" ||
      String(book.classification ?? "").trim() === classificationFilter;

    return matchesQuery &&
      matchesStatus &&
      matchesLanguage &&
      matchesClassification;
  });

  const available = allBooks.filter(
    book => book.status === "available"
  ).length;

  const claimed = allBooks.filter(
    book => book.status === "claimed"
  ).length;

  $("summary").textContent = t("summary")({
    total: allBooks.length,
    available,
    claimed
  });

  // 電腦版：保留原本八欄表格
  $("books").innerHTML = filtered.length
    ? filtered.map(book => {
        const statusClass =
          book.status === "claimed" ? "claimed" : "available";

        return `
          <tr>
            <td>${esc(book.title || t("missingTitle"))}</td>
            <td>${esc(book.author || "—")}</td>
            <td>${esc(book.barcode || "—")}</td>
            <td>${esc(displayLanguage(book.language))}</td>
            <td>${esc(book.call_number || "—")}</td>
            <td>${esc(book.classification || "—")}</td>
            <td>${esc(book.location || "—")}</td>
            <td>
              <span class="status ${statusClass}">
                ${esc(displayStatus(book.status))}
              </span>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="8">${esc(t("noResults"))}</td></tr>`;

  // 手機版：卡片顯示相同的篩選結果
  const cards = $("bookCards");

  if (!cards) return;

  cards.innerHTML = filtered.length
    ? filtered.map(book => {
        const statusClass =
          book.status === "claimed" ? "claimed" : "available";

        const fields = [
          ["author", book.author],
          ["barcode", book.barcode],
          ["language", displayLanguage(book.language)],
          ["callNumber", book.call_number],
          ["classification", book.classification],
          ["location", book.location]
        ];

        return `
          <article class="book-card">
            <header class="book-card-header">
              <h2 class="book-card-title">
                ${esc(book.title || t("missingTitle"))}
              </h2>
              <div class="book-card-status">
                <span class="status ${statusClass}">
                  ${esc(displayStatus(book.status))}
                </span>
              </div>
            </header>

            <dl class="book-card-details">
              ${fields.map(([key, value]) => `
                <div class="book-card-field">
                  <dt>${esc(t(key))}</dt>
                  <dd>${esc(value || "—")}</dd>
                </div>
              `).join("")}
            </dl>
          </article>
        `;
      }).join("")
    : `<div class="book-card-empty">${esc(t("noResults"))}</div>`;
}
