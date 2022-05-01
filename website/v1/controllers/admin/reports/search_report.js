const  path = require("path");
// Local modules
const ALL_MODELS = require(path.join(__dirname, "..", "..", "..", "..", "..", "utilities/allModels"));
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const search_report = async ( req, res, next) => {
    const { 
        start_date, end_date,
        search_quantity_start, search_quantity_end,
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
			//  regexp = new RegExp(category, "i");
			filter["$or"] = [
				{ "searchKeyWord": regexp },
			];
		}

         /**
          * Filtering according to date
          */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 7);
 
         if(start_date)
             filter.createdAt = { $gte: new Date(start_date) }
         if(end_date)
             filter.createdAt = { $lte: new Date(end_date) }
        if(start_date && end_date) {
            filter.createdAt = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }
        }

        // Going to apply defalult seven day date filter
        if(!start_date)
            filter.createdAt = {$gte: defaultDate}
 
        /**
         * Filtering search quantity
        */
        const filterSecond = {};
         
        // search quantity
        if(search_quantity_start) 
            filterSecond.search_quantity = {$gte: search_quantity_start}
        if(search_quantity_end) 
            filterSecond.search_quantity = {$lte: search_quantity_end}
        if(search_quantity_start && search_quantity_end) {
            filterSecond.search_quantity = {
                $gte: search_quantity_start,
                $lte: search_quantity_end
            }
        }
        // End of search quantity

        // Fetching search history
        const searches = await ALL_MODELS.searchModel.aggregate([
            // Match 
            { $match: filter },
            // Group
            {
                $group: {
                    _id: "$searchKeyWord",
                    search_quantity: {
                        $sum: {$add: 1}
                    },
                    updatedAt : { $first: '$updatedAt' },
                }
            },
            // Match
            { $match: filterSecond },
            { $sort: { search_quantity : -1,updatedAt: -1 }},
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
			totalCount = searches[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: searches.length ? searches[0].paginatedResults : [],
			pageNo: pageNo,
		});
    } catch(error) { return res.status(403).send({ message: error.message }); }
}// End of search_report

const search_report_excel = async ( req, res, next) => {
    const { 
        start_date, end_date,
        search_quantity_start, search_quantity_end, 
        search
    } = req.body;

    try {
         // Filter
         const filter = {};
         if (search) {
			const regexp = new RegExp(search, "i");
			//  regexp = new RegExp(category, "i");
			filter["$or"] = [
				{ "searchKeyWord": regexp },
			];
		}
         /**
          * Filtering according to date
          */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 7);
 
         if(start_date)
             filter.createdAt = { $gte: new Date(start_date) }
         if(end_date)
             filter.createdAt = { $lte: new Date(end_date) }
        if(start_date && end_date) {
            filter.createdAt = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }
        }

        // Going to apply defalult seven day date filter
        if(!start_date)
            filter.createdAt = {$gte: defaultDate}
 
        /**
         * Filtering search quantity
        */
        const filterSecond = {};
         
        // search quantity
        if(search_quantity_start) 
            filterSecond.search_quantity = {$gte: search_quantity_start}
        if(search_quantity_end) 
            filterSecond.search_quantity = {$lte: search_quantity_end}
        if(search_quantity_start && search_quantity_end) {
            filterSecond.search_quantity = {
                $gte: search_quantity_start,
                $lte: search_quantity_end
            }
        }
        // End of search quantity

        // Fetching search history
        const searches = await ALL_MODELS.searchModel.aggregate([
            // Match 
            { $match: filter },
            // Group
            {
                $group: {
                    _id: "$searchKeyWord",
                    search_quantity: {
                        $sum: {$add: 1}
                    },
                    updatedAt : { $first: '$updatedAt' },
                }
            },
            // Match
            { $match: filterSecond },
            { $sort: {search_quantity : -1, updatedAt: -1 }}
        ]);

        var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < searches.length; index++) {
			const element = searches[index];

			excelExportData.push({
				search_term: element._id,
                search_quantity: element.search_quantity
			});
		}

        var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}search_term_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Search Term Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
		});

		let data = await newReport.save();

		return res.send({
			message: "Your XL will start downloading now.",
			d: data,
		});
    } catch(error) { return res.status(403).send({ message: error.message }); }
}// End of search_report


module.exports = {search_report, search_report_excel};