const  path = require("path");

// Local modules
const ALL_MODELS = require(path.join(__dirname, "..", "..", "..", "..", "..", "utilities/allModels"));
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const tag_report = async ( req, res, next) => {
    let { 
        count_start, count_end, 
        search
    } = req.body;

    let {
        limit, page,
    } = req.body;

    if (!limit) { limit = 10; }
	if (!page) { page = 1; }

	let perPage = parseInt(limit);
	let pageNo = Math.max(0, parseInt(page));

	if (pageNo > 0) {
		pageNo = pageNo - 1;
	} else if (pageNo < 0) {
		pageNo = 0;
	}

    try {
         // Filter
         const filter = {};
         if (search) {
			const regexp = new RegExp(search, "i");
			filter["$or"] = [
				{ "tag": regexp },
			];
		}

        /**
         * Filtering according to date
         */
        
        if(count_start)
            filter.count = { $gte: count_start }
        if(count_end)
            filter.count = { $lte: count_end }
        if(count_start && count_end) {
            filter.count = {
                $gte: count_start,
                $lte: count_end
            }
        }

        // Fetching product viewed
        const tags = await ALL_MODELS.productVariant.aggregate([
            // Match
            { $unwind: "$tags" },
            { $unwind: "$tags.list" },
            {
                $group: {
                    _id: "$tags.list",
                    count: {
                        $sum: {$add: 1}
                    },
                }
            },
            {
                $project: {
                    _id: 0,
                    tag: "$_id", 
                    count: 1, 
                }
            },
            { $match: filter },
            { $sort: { count: -1}},
            {
				$facet: {
					paginatedResults: [
						{
							$skip: perPage * pageNo,
						},
						{
							$limit: perPage,
						},
					],
					totalCount: [
						{
							$count: "count",
						},
					],
				},
			},
        ]);

        let totalCount = 0;
		try {
			totalCount = tags[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: tags.length ? tags[0].paginatedResults : [],
			pageNo: pageNo,
		});
    } catch(error) { return res.status(403).send({ message: error.message }); }
}// End of tag_report


const tag_report_excel = async ( req, res, next) => {
    let { 
        count_start, count_end, 
        search
    } = req.body;

    try {
         // Filter
         const filter = {};
         if (search) {
			const regexp = new RegExp(search, "i");
			filter["$or"] = [
				{ "tag": regexp },
			];
		}

        if(count_start)
            filter.count = { $gte: count_start }
        if(count_end)
            filter.count = { $lte: count_end }
        if(count_start && count_end) {
            filter.count = {
                $gte: count_start,
                $lte: count_end
            }
        }

        // Fetching product viewed
        const tags = await ALL_MODELS.productVariant.aggregate([
            // Match
            { $unwind: "$tags" },
            { $unwind: "$tags.list" },
            {
                $group: {
                    _id: "$tags.list",
                    count: {
                        $sum: {$add: 1}
                    },
                }
            },
            {
                $project: {
                    _id: 0,
                    tag: "$_id", 
                    count: 1, 
                }
            },
            { $match: filter },
            { $sort: { count: -1}}
        ]);

        var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < tags.length; index++) {
			const element = tags[index];
			excelExportData.push({
                tag: element.tag, 
                count: element.count,
			});
		}

        var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}tag_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Tag Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
		});

		let data = await newReport.save();

		return res.send({
			message: "Your XL will start downloading now.",
			d: data,
		});
    } catch(error) { return res.status(403).send({ message: error.message }); }
}

module.exports = {tag_report, tag_report_excel};