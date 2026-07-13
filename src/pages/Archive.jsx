import React, { useMemo, useState, useEffect } from "react";
import DataTable from "../components/common/DataTable";
import { supabase } from "../lib/supabase";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Leads.module.css";

// Removed mockLeads

const columnHelper = createColumnHelper();

const Archive = () => {
  const [leads, setLeads] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select(
            `
          id, 
          lead_number, 
          created_at, 
          origin_city, 
          origin_state, 
          origin_zip,
          destination_city, 
          destination_state, 
          destination_zip,
          estimated_price, 
          carrier_pay,
          ship_date,
          source,
          transport_type, 
          status,
          assignee:profiles!assigned_to(first_name, last_name),
          customers (first_name, last_name),
          lead_vehicles (vehicle_year, vehicle_make, vehicle_model)
        `,
          )
          .eq("is_archived", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const formattedLeads = sortedData.map((lead) => ({
            id: lead.lead_number,
            displayId: `L-${lead.lead_number}`,
            created: new Date(lead.created_at).toLocaleString(),
            customer: lead.customers
              ? `${lead.customers.first_name} ${lead.customers.last_name}`
              : "Unknown",
            vehicles:
              lead.lead_vehicles && lead.lead_vehicles.length > 0
                ? lead.lead_vehicles
                    .map(
                      (v) =>
                        `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`,
                    )
                    .join(", ")
                : "Unknown",
            origin: `${lead.origin_city}, ${lead.origin_state}`,
            originZip: lead.origin_zip || "",
            destination: `${lead.destination_city}, ${lead.destination_state}`,
            destinationZip: lead.destination_zip || "",
            transportType: lead.transport_type,
            tariff: `$${lead.estimated_price || 0}`,
            carrierPay: `$${lead.carrier_pay || 0}`,
            brokerFee: `$${(lead.estimated_price || 0) - (lead.carrier_pay || 0)}`,
            shipDate: lead.ship_date || "",
            assignedTo: lead.assignee
              ? `${lead.assignee.first_name} ${lead.assignee.last_name}`
              : "Unassigned",
            source: lead.source || "Manual",
            status: lead.status,
          }));

          setLeads(formattedLeads);
        }
      } catch (err) {
        console.error("Error fetching leads:", err);
      }
    };

    fetchLeads();
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Lead #",
        cell: (info) => (
          <Link
            to={`/leads/${info.getValue()}`}
            style={{ color: "var(--brand-blue)", textDecoration: "none" }}
          >
            {info.row.original.displayId}
          </Link>
        ),
      }),
      columnHelper.accessor("created", {
        header: "Created",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("customer", {
        header: "Customer",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("vehicles", {
        header: "Vehicles",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("origin", {
        header: "Origin",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("originZip", {
        header: "Origin Zip",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("destination", {
        header: "Destination",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("destinationZip", {
        header: "Dest Zip",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("shipDate", {
        header: "Ship Date",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("transportType", {
        header: "Transport",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("tariff", {
        header: "Tariff",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("carrierPay", {
        header: "Carrier Pay",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("brokerFee", {
        header: "Broker Fee",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("source", {
        header: "Source",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("assignedTo", {
        header: "Assigned To",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.8rem",
              backgroundColor:
                info.getValue() === "New"
                  ? "rgba(40, 167, 69, 0.2)"
                  : "rgba(255, 193, 7, 0.2)",
              color: info.getValue() === "New" ? "#28a745" : "#ffc107",
            }}
          >
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Archived Records</h1>
        <p className={styles.pageSubtitle}>
          Manage and restore your archived leads and orders.
        </p>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable columns={columns} data={leads} />
      </div>
    </div>
  );
};

export default Archive;
