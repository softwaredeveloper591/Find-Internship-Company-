const express = require("express");
const router= express.Router();
const nodeMailer = require("nodemailer");

const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole")

const Secretary_model= require("../models/secretary-model");
const Application_model= require("../models/application-model");
const Announcement_model= require("../models/announcement-model");
const Company_model= require("../models/company-model");
const Student_model= require("../models/student-model");

router.get("/secretary", [auth, checkUserRole("secretary")], async function (req, res) {
    try {
        const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
		const applications = await Application_model.findAll({
			where: {
				isApprovedByCompany: true,
				isApprovedByDIC: true			
			},
            include: [
				{
                	model: Announcement_model,
					include: {
						model: Company_model,
						attributes: ['name']
					}
				},
				{
					model: Student_model,
					attributes: ['username'] ['id']
				}
			]
        });

        res.render("Secretary/secretary", {
            usertype: "secretary",
            dataValues: secretary.dataValues,
			applications
        });
    } catch (err) {
        console.error("Error loading admin dashboard:", err);
        res.status(500).send("Error loading admin dashboard.");
    }
});

router.get("/secretary/applications/download/:applicationId/:fileType",[auth,checkUserRole("admin")],async function(req,res){
    const applicationId = req.params.applicationId;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{applicationId:applicationId, fileType:fileType}});
    if(!takenDocument){
        throw error("There is no such document.")
    }
    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
});

module.exports= router;