const width = window.innerWidth;
const height = window.innerHeight;

const margin = { top: 10, right: 30, bottom: 40, left: 60 };

// sankey dimensions 
const sankeyWidth = width * 0.45;
const sankeyHeight = height * 0.6;
const sankeyLeft = 50;
const sankeyTop = 40;

// line & bar chart dimensions 
const miniW = 300, miniH = 200;
const lineX = width - miniW - 60;
const lineY = 60;
const barX = lineX;
const barY = lineY + miniH + 60;

const svg = d3.select("svg");

d3.csv("student-mat.csv").then(data => {
  data.forEach(d => {
    d.age = +d.age;
    d.Walc = +d.Walc;
    d.G3 = +d.G3;
    d.absences = +d.absences;
  });

  // sankey data
  const sankeyData = { nodes: [], links: [] };
  const linkCounts = {};

  data.forEach(d => {
    const sources = [
      `School Support: ${d.schoolsup}`,
      `Family Support: ${d.famsup}`
    ];
    const target = `Pursue Higher Education?: ${d.higher}`;
    sources.forEach(src => {
      const key = `${src}->${target}`;
      linkCounts[key] = (linkCounts[key] || 0) + 1;
    });
  });

  const nodeSet = new Set();
  Object.keys(linkCounts).forEach(key => {
    const [src, tgt] = key.split("->");
    nodeSet.add(src);
    nodeSet.add(tgt);
  });

  const nodes = Array.from(nodeSet);
  const nodeIndex = Object.fromEntries(nodes.map((n, i) => [n, i]));

  sankeyData.nodes = nodes.map(name => ({ name }));
  sankeyData.links = Object.entries(linkCounts).map(([key, value]) => {
    const [src, tgt] = key.split("->");
    return {
      source: nodeIndex[src],
      target: nodeIndex[tgt],
      value
    };
  });

  const g3 = svg.append("g")
    .attr("transform", `translate(${sankeyLeft}, ${sankeyTop})`);

  const sankeyGen = d3.sankey()
    .nodeWidth(20)
    .nodePadding(15)
    .extent([[0, 0], [sankeyWidth, sankeyHeight]]);

  const graph = sankeyGen(sankeyData);

  g3.append("g").selectAll("rect")
    .data(graph.nodes)
    .enter().append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", "#888");

  g3.append("g").selectAll("path")
    .data(graph.links)
    .enter().append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", "#000")
    .attr("stroke-width", d => d.width)
    .attr("fill", "none")
    .attr("opacity", 0.3);

  g3.append("g").selectAll("text")
    .data(graph.nodes)
    .enter().append("text")
    .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
    .text(d => d.name);

  // line chart
  const ageAlcohol = d3.rollups(data, v => d3.mean(v, d => d.Walc), d => d.age)
    .sort((a, b) => a[0] - b[0]);

  const x1 = d3.scaleLinear()
    .domain(d3.extent(ageAlcohol, d => d[0]))
    .range([margin.left, miniW - margin.right]);

  const y1 = d3.scaleLinear()
    .domain([0, d3.max(ageAlcohol, d => d[1])])
    .nice()
    .range([miniH - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x1(d[0]))
    .y(d => y1(d[1]));

  const g1 = svg.append("g")
    .attr("transform", `translate(${lineX}, ${lineY})`);

  g1.append("g")
    .attr("transform", `translate(0,${miniH - margin.bottom})`)
    .call(d3.axisBottom(x1).ticks(6));

  g1.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y1).ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
      .attr("x2", miniW - margin.left - margin.right)
      .attr("stroke-opacity", 0.1));

  g1.append("path")
    .datum(ageAlcohol)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  g1.append("text")
    .attr("x", miniW / 2)
    .attr("y", miniH + 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Age");

  g1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -miniH / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Avg Weekend Alcohol Use (Walc)");

  // === Bar Chart: Avg Walc by Absences ===
  const walcByAbs = d3.rollups(
    data,
    v => d3.mean(v, d => d.Walc),
    d => d.absences
  ).sort((a, b) => a[0] - b[0]);

  const x2 = d3.scaleBand()
    .domain(walcByAbs.map(d => d[0]))
    .range([0, miniW])
    .paddingInner(0.3)
    .paddingOuter(0.2);

  const y2 = d3.scaleLinear()
    .domain([0, d3.max(walcByAbs, d => d[1])])
    .nice()
    .range([miniH, 0]);

  const g2 = svg.append("g")
    .attr("transform", `translate(${barX}, ${barY})`);

  g2.append("g")
    .attr("transform", `translate(0, ${miniH})`)
    .call(d3.axisBottom(x2).tickValues(x2.domain().filter((d, i) => i % 2 === 0)));

  g2.append("g")
    .call(d3.axisLeft(y2).ticks(5));

  g2.selectAll("rect")
    .data(walcByAbs)
    .enter().append("rect")
    .attr("x", d => x2(d[0]))
    .attr("y", d => y2(d[1]))
    .attr("width", x2.bandwidth())
    .attr("height", d => miniH - y2(d[1]))
    .attr("fill", "#f77f00");

  g2.append("text")
    .attr("x", miniW / 2)
    .attr("y", miniH + 35)
    .attr("text-anchor", "middle")
    .text("Absences");

  g2.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -miniH / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Avg Weekend Alcohol Use");
}).catch(console.error);
