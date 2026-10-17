import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiEye,
  FiFileText,
  FiHash,
  FiHome,
  FiLoader,
  FiLock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-hot-toast";
import { DatePickerField } from "../PortalDatePicker";
import StateDistrictSelect from "../state-district-select";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useUserPermissions } from "../../utils/permission-helper";
import { uploadOneSaasFileUrl } from "../../utils/onesaas-upload";
import BulkImportClientsModal from "./BulkImportClientsModal";
import {
  FormField,
  FormSection,
  IconInput,
  SegmentedControl,
  SelectInput,
  WizardBody,
  WizardFooter,
  WizardHeader,
  WizardModal,
  WizardStepIntro,
  WizardStepper,
  inputClass,
} from "./WizardModalParts";

const STEPS = [
  { title: "Basic details", subtitle: "Identity & contact" },
  { title: "Address", subtitle: "Where they live" },
  { title: "Business", subtitle: "Firms & groups" },
  { title: "Opening balance", subtitle: "Review & create" },
];

const STEP_COPY = {
  1: {
    title: "Who is the client?",
    description: "Start with the PAN — we check it against your existing clients as you type.",
  },
  2: { title: "Residential address", description: "Used on invoices, letters and reminders." },
  3: {
    title: "Business details",
    description: "Every client has at least one firm. Add more if they run several businesses.",
  },
  4: {
    title: "Opening balance & review",
    description: "Set the balance you are carrying forward, check the details and create the client.",
  },
};

const DATE_BTN = "text-left min-h-[42px]";

/**
 * Inner form. Mounted fresh every time the modal opens (see `key` in ClientCreateModal).
 */
function ClientCreateForm({ onClose, onCreated, onOpenBulk }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [showCreateSuccessModal, setShowCreateSuccessModal] = useState(false);
  const [clientCreateSuccess, setClientCreateSuccess] = useState(null);
  const [panDuplicateClient, setPanDuplicateClient] = useState(null);
  const [panChecking, setPanChecking] = useState(false);
  const [showExistingPanModal, setShowExistingPanModal] = useState(false);
  const [firmTypes, setFirmTypes] = useState([
    { value: "individual", label: "Individual" },
  ]);

  const [searchGroup, setSearchGroup] = useState("");

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    pan: "",
    full_name: "",
    care_of: "S/O",
    guardian_name: "",
    mobile: "",
    country_code: "91",
    email: "",
    date_of_birth: "",
    gender: "male",
    image: null,

    // Step 2: Contact Details
    state: "",
    district: "",
    town_or_village: "",
    pincode: "",
    address_line_1: "",
    address_line_2: "",

    // Step 3: Business Details
    businesses: [
      {
        type: "individual",
        pan: "",
        firm: "",
        gst: "",
        tan: "",
        vat: "",
        cin: "",
        file: "",
        address: {
          state: "",
          district: "",
          town: "",
          pincode: "",
          address_line_1: "",
          address_line_2: "",
        },
        groups: [],
      },
    ],

    // Step 4: Opening Balance
    opening_balance: {
      amount: "",
      type: "credit",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const debouncedPan = useDebouncedValue(formData.pan, 400);


  useEffect(() => {
    let mounted = true;

    const fetchFirmTypes = async () => {
      try {
        const headers = getHeaders();
        if (!headers) return;

        const response = await axios.get(`${API_BASE_URL}/utils/firm-types`, {
          headers,
        });

        if (
          mounted &&
          response.data?.success &&
          Array.isArray(response.data.data) &&
          response.data.data.length > 0
        ) {
          setFirmTypes(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching firm types:", error);
      }
    };

    fetchFirmTypes();
    return () => {
      mounted = false;
    };
  }, []);


  // When basic PAN changes, update first business PAN if type is individual
  useEffect(() => {
    if (formData.businesses[0]?.type === "individual") {
      setFormData((prev) => ({
        ...prev,
        businesses: prev.businesses.map((business, index) =>
          index === 0 ? { ...business, pan: prev.pan } : business,
        ),
      }));
    }
  }, [formData.pan, formData.businesses[0]?.type]);

  useEffect(() => {
    const checkPanAvailability = async () => {
      const pan = debouncedPan.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

      if (!panRegex.test(pan)) {
        setPanDuplicateClient(null);
        setPanChecking(false);
        return;
      }

      const authHeaders = getHeaders();
      if (!authHeaders) {
        setPanDuplicateClient(null);
        setPanChecking(false);
        return;
      }

      setPanChecking(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/client/check-pan`, {
          headers: authHeaders,
          params: { pan },
        });

        if (response.data?.success) {
          const { exist } = response.data;
          if (exist && typeof exist === "object") {
            setPanDuplicateClient(exist);
          } else {
            setPanDuplicateClient(null);
          }
        } else {
          setPanDuplicateClient(null);
        }
      } catch (error) {
        console.error("PAN check error:", error);
        setPanDuplicateClient(null);
      } finally {
        setPanChecking(false);
      }
    };

    checkPanAvailability();
  }, [debouncedPan]);

  // Dummy data arrays
  const [guardianTypes] = useState([
    { value: "S/O", name: "Son Of" },
    { value: "D/O", name: "Daughter Of" },
    { value: "W/O", name: "Wife Of" },
    { value: "C/O", name: "Care Of" },
  ]);

  const [countryCodes] = useState([
    { value: "91", name: "India (+91)" },
    { value: "1", name: "USA (+1)" },
    { value: "44", name: "UK (+44)" },
    { value: "61", name: "Australia (+61)" },
  ]);

  const [genders] = useState([
    { value: "male", name: "Male" },
    { value: "female", name: "Female" },
    { value: "other", name: "Other" },
  ]);

  // Real branch groups (the old page used hard-coded sample groups)
  const [groupsList, setGroupsList] = useState([]);
  useEffect(() => {
    let alive = true;
    const headers = getHeaders();
    if (!headers) return undefined;
    axios
      .get(`${API_BASE_URL}/group/list?page=1&limit=200`, { headers })
      .then((response) => {
        if (!alive || !response.data?.success) return;
        const rows = Array.isArray(response.data.data) ? response.data.data : [];
        setGroupsList(
          rows
            .filter((g) => String(g.status ?? "1") === "1")
            .map((g) => ({ group_id: g.group_id, name: g.name || g.group_id, selected: false })),
        );
      })
      .catch((error) => console.error("Error fetching groups:", error));
    return () => {
      alive = false;
    };
  }, []);

  const filteredGroups = groupsList.filter((group) =>
    group.name.toLowerCase().includes(searchGroup.toLowerCase()),
  );

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, type, files } = e.target;
    let value = e.target.value;

    if (type === "file") {
      const file = files[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setErrors((prev) => ({
            ...prev,
            image: "Please upload an image file",
          }));
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          setErrors((prev) => ({
            ...prev,
            image: "Image size should be less than 5MB",
          }));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);

        setErrors((prev) => ({ ...prev, image: "" }));
        setUploading(true);
        uploadOneSaasFileUrl(file)
          .then((url) => {
            setFormData((prev) => ({ ...prev, image: url }));
          })
          .catch((error) => {
            console.error("Error uploading image:", error);
            setErrors((prev) => ({
              ...prev,
              image: error.message || "Failed to upload image",
            }));
            setImagePreview(null);
            setFormData((prev) => ({ ...prev, image: null }));
          })
          .finally(() => {
            setUploading(false);
          });
      }
    } else {
      // PAN validation
      if (name === "pan") {
        value = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (value.length > 10) return;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const isValid = panRegex.test(value);
        setErrors((prev) => ({
          ...prev,
          pan: value && !isValid ? "Invalid PAN format (e.g., ABCDE1234H)" : "",
        }));
        setPanDuplicateClient(null);
      }

      // Email validation
      if (name === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setErrors((prev) => ({
          ...prev,
          email:
            value && !emailRegex.test(value) ? "Invalid email address" : "",
        }));
      }

      // Mobile validation
      if (name === "mobile") {
        if (value.length > 10) return;
        const mobileRegex = /^[6-9]\d{9}$/;
        setErrors((prev) => ({
          ...prev,
          mobile:
            value && !mobileRegex.test(value) ? "Invalid mobile number" : "",
        }));
      }

      // GST validation
      if (name === "gst") {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        setErrors((prev) => ({
          ...prev,
          gst:
            value && !gstRegex.test(value.toUpperCase())
              ? "Invalid GST format"
              : "",
        }));
      }

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle business input changes
  const handleBusinessChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      businesses: prev.businesses.map((business, i) =>
        i === index ? { ...business, [field]: value } : business,
      ),
    }));
  };

  // Handle business address changes
  const handleBusinessAddressChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      businesses: prev.businesses.map((business, i) =>
        i === index
          ? {
              ...business,
              address: { ...business.address, [field]: value },
            }
          : business,
      ),
    }));
  };

  // Add new business
  const addBusiness = () => {
    setFormData((prev) => ({
      ...prev,
      businesses: [
        ...prev.businesses,
        {
          type: "individual",
          pan: "",
          firm: "",
          gst: "",
          tan: "",
          vat: "",
          cin: "",
          file: "",
          address: {
            state: "",
            district: "",
            town: "",
            pincode: "",
            address_line_1: "",
            address_line_2: "",
          },
          groups: [],
        },
      ],
    }));
  };

  // Remove business
  const removeBusiness = (index) => {
    if (formData.businesses.length > 1) {
      setFormData((prev) => ({
        ...prev,
        businesses: prev.businesses.filter((_, i) => i !== index),
      }));
    }
  };

  // Handle group selection
  const toggleGroup = (groupId) => {
    setGroupsList((prev) =>
      prev.map((group) =>
        group.group_id === groupId
          ? { ...group, selected: !group.selected }
          : group,
      ),
    );

    setFormData((prev) => ({
      ...prev,
      businesses: prev.businesses.map((business, index) =>
        index === 0
          ? {
              ...business,
              groups: business.groups.includes(groupId)
                ? business.groups.filter((id) => id !== groupId)
                : [...business.groups, groupId],
            }
          : business,
      ),
    }));
  };

  // Select all groups
  const selectAllGroups = () => {
    setGroupsList((prev) =>
      prev.map((group) => ({ ...group, selected: true })),
    );
    setFormData((prev) => ({
      ...prev,
      businesses: prev.businesses.map((business, index) =>
        index === 0
          ? {
              ...business,
              groups: groupsList.map((group) => group.group_id),
            }
          : business,
      ),
    }));
  };

  // Deselect all groups
  const deselectAllGroups = () => {
    setGroupsList((prev) =>
      prev.map((group) => ({ ...group, selected: false })),
    );
    setFormData((prev) => ({
      ...prev,
      businesses: prev.businesses.map((business, index) =>
        index === 0
          ? {
              ...business,
              groups: [],
            }
          : business,
      ),
    }));
  };

  // Handle opening balance change
  const handleOpeningBalanceChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      opening_balance: {
        ...prev.opening_balance,
        [field]: value,
      },
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Step 1 validation
    if (currentStep === 1) {
      if (!formData.pan.trim()) newErrors.pan = "PAN is required";
      else if (panDuplicateClient)
        newErrors.pan = "A client already exists with this PAN";
      if (!formData.full_name.trim())
        newErrors.full_name = "Full name is required";
      if (!formData.mobile.trim()) newErrors.mobile = "Mobile is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      if (!formData.date_of_birth)
        newErrors.date_of_birth = "Date of birth is required";
      if (!formData.guardian_name.trim())
        newErrors.guardian_name = "Guardian name is required";
    }

    // Step 2 validation
    if (currentStep === 2) {
      if (!formData.state) newErrors.state = "State is required";
      if (!formData.district) newErrors.district = "District is required";
      if (!formData.town_or_village.trim())
        newErrors.town_or_village = "Town/Village is required";
      if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    }

    // Step 3 validation
    if (currentStep === 3) {
      formData.businesses.forEach((business, index) => {
        if (!business.pan.trim())
          newErrors[`business_pan_${index}`] = "Business PAN is required";
        if (business.type !== "individual" && !business.firm.trim()) {
          newErrors[`business_firm_${index}`] = "Firm name is required";
        }
      });
    }

    // Step 4 validation
    if (currentStep === 4) {
      if (!formData.opening_balance.amount)
        newErrors.opening_amount = "Opening balance amount is required";
      if (!formData.opening_balance.date)
        newErrors.opening_date = "Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    if (panChecking) {
      toast("Please wait — checking PAN availability…");
      return;
    }

    if (panDuplicateClient) {
      setCurrentStep(1);
      setErrors((prev) => ({
        ...prev,
        pan: "A client already exists with this PAN",
      }));
      toast.error("A client already exists with this PAN. Please use a different PAN.");
      return;
    }

    setLoading(true);

    // In the handleSubmit function, replace the API call section with this:

    try {
      const payload = {
        profile: {
          pan: formData.pan.toUpperCase(),
          full_name: formData.full_name.trim(),
          care_of: formData.care_of,
          guardian_name: formData.guardian_name.trim(),
          mobile: formData.mobile,
          country_code: formData.country_code,
          email: formData.email.trim(),
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          image: formData.image || null,
        },
        address: {
          state: formData.state,
          district: formData.district,
          town_or_village: formData.town_or_village.trim(),
          pincode: formData.pincode,
          address_line_1: formData.address_line_1.trim() || null,
          address_line_2: formData.address_line_2.trim() || null,
        },
        business: formData.businesses.map((business) => ({
          type: business.type,
          pan: business.pan.toUpperCase(),
          firm: business.firm.trim() || null,
          gst: business.gst ? business.gst.toUpperCase() : null,
          tan: business.tan ? business.tan.toUpperCase() : null,
          vat: business.vat || null,
          cin: business.cin || null,
          file: business.file || null,
          address: {
            state: business.address.state,
            district: business.address.district,
            town: business.address.town.trim(),
            pincode: business.address.pincode,
            address_line_1: business.address.address_line_1.trim() || null,
            address_line_2: business.address.address_line_2.trim() || null,
          },
          groups: business.groups,
        })),
        opening_balance: {
          amount: parseFloat(formData.opening_balance.amount) || 0,
          type: formData.opening_balance.type,
          date: formData.opening_balance.date,
        },
      };

      // console.log('Sending payload to API:', JSON.stringify(payload, null, 2));

      // Get auth headers
      const authHeaders = getHeaders();
      if (!authHeaders) {
        toast.error("Your session has expired. Please log in again.");
        return;
      }

      // Call the actual API endpoint
      const response = await axios.post(
        `${API_BASE_URL}/client/create`,
        payload,
        {
          headers: authHeaders,
        },
      );

      // console.log('API Response:', response.data);

      // Handle API response
      if (response.data.success) {
        const created = response.data.data || null;
        setClientCreateSuccess(created);
        setShowCreateSuccessModal(true);
        resetForm();
        onCreated?.(created);
        try {
          window.dispatchEvent(new CustomEvent("ooms:client-created", { detail: created }));
        } catch (_) {
          /* ignore */
        }
      } else {
        // Handle API error response
        const errorMessage = response.data.message || "Failed to create client";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating client:", error);

      // Display user-friendly error message
      let errorMessage = "Error creating client. Please try again.";

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            errorMessage =
              data.message ||
              "Invalid data provided. Please check your inputs.";
            break;
          case 401:
            errorMessage = "Unauthorized. Please login again.";
            break;
          case 403:
            errorMessage =
              "Forbidden. You do not have permission to create clients.";
            break;
          case 409:
            errorMessage =
              data.message ||
              "A client with this PAN already exists in this branch.";
            break;
          case 422:
            errorMessage =
              "Validation error. Please check all required fields.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage =
              data.message || `Error (${status}): Please try again.`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage =
          "No response from server. Please check your internet connection.";
      } else {
        // Request setup error
        errorMessage = error.message || "Error setting up request.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      pan: "",
      full_name: "",
      care_of: "S/O",
      guardian_name: "",
      mobile: "",
      country_code: "91",
      email: "",
      date_of_birth: "",
      gender: "male",
      image: null,
      state: "",
      district: "",
      town_or_village: "",
      pincode: "",
      address_line_1: "",
      address_line_2: "",
      businesses: [
        {
          type: "individual",
          pan: "",
          firm: "",
          gst: "",
          tan: "",
          vat: "",
          cin: "",
          file: "",
          address: {
            state: "",
            district: "",
            town: "",
            pincode: "",
            address_line_1: "",
            address_line_2: "",
          },
          groups: [],
        },
      ],
      opening_balance: {
        amount: "",
        type: "credit",
        date: new Date().toISOString().split("T")[0],
      },
    });
    setGroupsList((prev) =>
      prev.map((group) => ({ ...group, selected: false })),
    );
    setImagePreview(null);
    setErrors({});
    setCurrentStep(1);

    // Reset search states
    setSearchGroup("");
    setPanDuplicateClient(null);
    setShowExistingPanModal(false);
    setPanChecking(false);
  };

  const closeCreateSuccessModal = () => {
    setShowCreateSuccessModal(false);
    setClientCreateSuccess(null);
  };

  const handleViewCreatedClient = () => {
    const username = clientCreateSuccess?.username;
    closeCreateSuccessModal();
    onClose?.();
    if (username) {
      navigate(`/client/profile/${username}`);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep >= 4) return;
    if (validateForm()) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.error("Please fix the highlighted fields to continue.");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const bodyRef = useRef(null);
  useEffect(() => {
    const scroller = bodyRef.current?.closest(".overflow-y-auto");
    if (scroller) scroller.scrollTop = 0;
  }, [currentStep]);

  const panValid = formData.pan.length === 10 && !errors.pan && !panDuplicateClient && !panChecking;
  const copy = STEP_COPY[currentStep];
  const firstBusiness = formData.businesses[0];

  const panAdornment = (
    <>
      {panChecking && <FiLoader className="h-4 w-4 animate-spin text-indigo-500" />}
      {panDuplicateClient && !panChecking && (
        <button
          type="button"
          onClick={() => setShowExistingPanModal(true)}
          className="rounded-md p-1 text-indigo-600 transition-colors hover:bg-indigo-50"
          title="View existing client"
          aria-label="View existing client with this PAN"
        >
          <FiEye className="h-4 w-4" />
        </button>
      )}
      {panValid && <FaCheckCircle className="text-sm text-emerald-500" />}
      {!panChecking && (errors.pan || panDuplicateClient) && <FaTimesCircle className="text-sm text-red-500" />}
    </>
  );

  return (
    <>
      <WizardHeader
        id="client-create-modal-title"
        icon={<FiUserPlus className="h-5 w-5" />}
        title="New client"
        subtitle={`Step ${currentStep} of ${STEPS.length} · ${STEPS[currentStep - 1].title}`}
        onClose={onClose}
        actions={
          <button
            type="button"
            onClick={onOpenBulk}
            className="ui-btn ui-btn-secondary ui-btn-sm"
            title="Import many clients from an Excel or CSV file"
          >
            <FiUpload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bulk import</span>
          </button>
        }
      />
      <WizardStepper
        steps={STEPS}
        current={currentStep}
        onStepClick={(n) => setCurrentStep(n)}
        canJumpTo={(n) => n < currentStep}
      />

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
        <WizardBody>
          <div ref={bodyRef}>
            <WizardStepIntro step={currentStep} total={STEPS.length} title={copy.title} description={copy.description} />

            {/* ---------------- Step 1: basic details ---------------- */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <FormSection title="Identity" icon={FiUser}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="PAN"
                      required
                      error={
                        errors.pan ||
                        (panDuplicateClient ? (
                          <>
                            A client already exists with this PAN.{" "}
                            <button
                              type="button"
                              onClick={() => setShowExistingPanModal(true)}
                              className="font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                              View client
                            </button>
                          </>
                        ) : null)
                      }
                      hint={panValid ? "PAN is available" : "10 characters, e.g. ABCDE1234F"}
                    >
                      <IconInput
                        icon={FiHash}
                        type="text"
                        name="pan"
                        value={formData.pan}
                        onChange={handleInputChange}
                        hasError={Boolean(errors.pan || panDuplicateClient)}
                        className={`font-mono uppercase tracking-wider ${panValid ? "border-emerald-400" : ""}`}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        autoFocus
                        right={panAdornment}
                      />
                    </FormField>
                    <FormField label="Full name" required error={errors.full_name}>
                      <IconInput
                        icon={FiUser}
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        hasError={Boolean(errors.full_name)}
                        placeholder="As on PAN card"
                      />
                    </FormField>
                    <FormField label="Relation" required>
                      <SelectInput name="care_of" value={formData.care_of} onChange={handleInputChange}>
                        {guardianTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.name}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>
                    <FormField label="Father / guardian name" required error={errors.guardian_name}>
                      <IconInput
                        icon={FiUser}
                        type="text"
                        name="guardian_name"
                        value={formData.guardian_name}
                        onChange={handleInputChange}
                        hasError={Boolean(errors.guardian_name)}
                        placeholder="Guardian's full name"
                      />
                    </FormField>
                    <FormField label="Date of birth" required error={errors.date_of_birth}>
                      <DatePickerField
                        value={formData.date_of_birth || ""}
                        onChange={(val) =>
                          setFormData((prev) => ({ ...prev, date_of_birth: typeof val === "string" ? val : "" }))
                        }
                        placeholder="DD/MM/YYYY"
                        mode="single"
                        hideTabs
                        showResetButton={false}
                        maxSelectableDate={new Date().toISOString().split("T")[0]}
                        wrapperClassName="w-full block"
                        buttonClassName={inputClass(Boolean(errors.date_of_birth), DATE_BTN)}
                      />
                    </FormField>
                    <FormField label="Gender" required>
                      <SegmentedControl
                        className="flex w-full [&>button]:flex-1 [&>button]:justify-center [&>button]:py-2"
                        value={formData.gender}
                        onChange={(v) => setFormData((prev) => ({ ...prev, gender: v }))}
                        options={genders.map((g) => ({ value: g.value, label: g.name }))}
                      />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Contact" icon={FiPhone} tone="emerald">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Mobile" required error={errors.mobile}>
                      <div className="flex gap-2">
                        <SelectInput
                          name="country_code"
                          value={formData.country_code}
                          onChange={handleInputChange}
                          className="w-[92px]"
                          aria-label="Country code"
                        >
                          {countryCodes.map((cc) => (
                            <option key={cc.value} value={cc.value}>
                              +{cc.value}
                            </option>
                          ))}
                        </SelectInput>
                        <div className="min-w-0 flex-1">
                          <IconInput
                            icon={FiPhone}
                            type="tel"
                            inputMode="numeric"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleInputChange}
                            hasError={Boolean(errors.mobile)}
                            className="font-mono tabular-nums"
                            placeholder="10-digit mobile"
                            maxLength={10}
                          />
                        </div>
                      </div>
                    </FormField>
                    <FormField label="Email" required error={errors.email}>
                      <IconInput
                        icon={FiMail}
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        hasError={Boolean(errors.email)}
                        placeholder="name@example.com"
                      />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Profile photo" description="Optional · JPG, PNG or GIF up to 5 MB" icon={FiCamera} tone="violet">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                      {uploading ? (
                        <div className="flex h-full w-full items-center justify-center">
                          <FiLoader className="h-5 w-5 animate-spin text-indigo-500" />
                        </div>
                      ) : imagePreview ? (
                        <img src={imagePreview} alt="Profile preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <FiUser className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      name="image"
                      onChange={handleInputChange}
                      className="hidden"
                      accept="image/*"
                      disabled={uploading}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                      >
                        <FiUpload className="h-3.5 w-3.5" />
                        {uploading ? "Uploading…" : imagePreview ? "Change photo" : "Upload photo"}
                      </button>
                      {imagePreview && !uploading && (
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setFormData((prev) => ({ ...prev, image: null }));
                          }}
                          className="ui-btn ui-btn-ghost ui-btn-sm text-rose-600"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                    {errors.image && <p className="w-full text-xs text-red-600">{errors.image}</p>}
                  </div>
                </FormSection>
              </div>
            )}

            {/* ---------------- Step 2: address ---------------- */}
            {currentStep === 2 && (
              <FormSection title="Address" icon={FiMapPin} tone="sky">
                <div className="space-y-4">
                  <div>
                    <StateDistrictSelect
                      selectedState={formData.state}
                      selectedDistrict={formData.district}
                      onStateChange={(state) =>
                        setFormData((prev) => ({
                          ...prev,
                          state,
                          district: state === prev.state ? prev.district : "",
                        }))
                      }
                      onDistrictChange={(district) => setFormData((prev) => ({ ...prev, district }))}
                      stateLabel="State"
                      districtLabel="District"
                      required
                    />
                    {(errors.state || errors.district) && (
                      <p className="mt-1 text-xs text-red-600">{errors.state || errors.district}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Town / village" required error={errors.town_or_village}>
                      <IconInput
                        icon={FiHome}
                        type="text"
                        name="town_or_village"
                        value={formData.town_or_village}
                        onChange={handleInputChange}
                        hasError={Boolean(errors.town_or_village)}
                        placeholder="e.g. Mangaldai"
                      />
                    </FormField>
                    <FormField label="PIN code" required error={errors.pincode}>
                      <IconInput
                        icon={FiMapPin}
                        type="text"
                        inputMode="numeric"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        hasError={Boolean(errors.pincode)}
                        className="font-mono tabular-nums"
                        placeholder="6 digits"
                        maxLength={6}
                      />
                    </FormField>
                    <FormField label="Address line 1">
                      <input
                        type="text"
                        name="address_line_1"
                        value={formData.address_line_1}
                        onChange={handleInputChange}
                        className={inputClass(false)}
                        placeholder="House, street"
                      />
                    </FormField>
                    <FormField label="Address line 2">
                      <input
                        type="text"
                        name="address_line_2"
                        value={formData.address_line_2}
                        onChange={handleInputChange}
                        className={inputClass(false)}
                        placeholder="Landmark, area"
                      />
                    </FormField>
                  </div>
                </div>
              </FormSection>
            )}

            {/* ---------------- Step 3: business ---------------- */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {formData.businesses.map((business, index) => {
                  const isIndividual = business.type === "individual";
                  return (
                    <FormSection
                      key={index}
                      title={index === 0 ? "Primary business" : `Business ${index + 1}`}
                      description={isIndividual ? "Individual — uses the client's own PAN" : business.firm || "Firm details"}
                      icon={FiBriefcase}
                      tone={index === 0 ? "indigo" : "amber"}
                      actions={
                        index > 0 ? (
                          <button
                            type="button"
                            onClick={() => removeBusiness(index)}
                            className="ui-btn ui-btn-ghost ui-btn-sm text-rose-600"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        ) : null
                      }
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Business type" required>
                          <SelectInput
                            value={business.type}
                            onChange={(e) => handleBusinessChange(index, "type", e.target.value)}
                          >
                            {firmTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </SelectInput>
                        </FormField>
                        <FormField
                          label="Business PAN"
                          required
                          error={errors[`business_pan_${index}`]}
                          hint={index === 0 && isIndividual ? "Copied from the client's PAN" : null}
                        >
                          <input
                            type="text"
                            value={business.pan}
                            onChange={(e) =>
                              handleBusinessChange(index, "pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                            }
                            className={inputClass(Boolean(errors[`business_pan_${index}`]), "font-mono uppercase tracking-wider")}
                            placeholder={isIndividual ? "Auto-filled" : "Firm PAN"}
                            readOnly={index === 0 && isIndividual}
                            disabled={index === 0 && isIndividual}
                            maxLength={10}
                          />
                        </FormField>

                        {!isIndividual && (
                          <>
                            <FormField label="Firm name" required error={errors[`business_firm_${index}`]} className="sm:col-span-2">
                              <IconInput
                                icon={FiBriefcase}
                                type="text"
                                value={business.firm}
                                onChange={(e) => handleBusinessChange(index, "firm", e.target.value)}
                                hasError={Boolean(errors[`business_firm_${index}`])}
                                placeholder="Registered name of the firm"
                              />
                            </FormField>
                            <FormField label="GSTIN" error={index === 0 ? errors.gst : null}>
                              <input
                                type="text"
                                value={business.gst}
                                onChange={(e) => handleBusinessChange(index, "gst", e.target.value.toUpperCase())}
                                className={inputClass(false, "font-mono uppercase")}
                                placeholder="15 characters"
                                maxLength={15}
                              />
                            </FormField>
                            <FormField label="TAN">
                              <input
                                type="text"
                                value={business.tan}
                                onChange={(e) => handleBusinessChange(index, "tan", e.target.value.toUpperCase())}
                                className={inputClass(false, "font-mono uppercase")}
                                placeholder="10 characters"
                                maxLength={10}
                              />
                            </FormField>
                            <FormField label="CIN">
                              <input
                                type="text"
                                value={business.cin}
                                onChange={(e) => handleBusinessChange(index, "cin", e.target.value.toUpperCase())}
                                className={inputClass(false, "font-mono uppercase")}
                                placeholder="For companies"
                              />
                            </FormField>
                            <FormField label="VAT / other registration">
                              <input
                                type="text"
                                value={business.vat}
                                onChange={(e) => handleBusinessChange(index, "vat", e.target.value)}
                                className={inputClass(false)}
                                placeholder="Optional"
                              />
                            </FormField>
                            <FormField label="File no.">
                              <IconInput
                                icon={FiFileText}
                                type="text"
                                value={business.file}
                                onChange={(e) => handleBusinessChange(index, "file", e.target.value)}
                                placeholder="Your office file number"
                              />
                            </FormField>

                            <div className="sm:col-span-2 border-t border-slate-100 pt-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Business address</p>
                              <div className="space-y-4">
                                <StateDistrictSelect
                                  selectedState={business.address.state}
                                  selectedDistrict={business.address.district}
                                  onStateChange={(state) => {
                                    handleBusinessAddressChange(index, "state", state);
                                    if (state !== business.address.state) handleBusinessAddressChange(index, "district", "");
                                  }}
                                  onDistrictChange={(district) => handleBusinessAddressChange(index, "district", district)}
                                  stateLabel="State"
                                  districtLabel="District"
                                />
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <FormField label="Town">
                                    <input
                                      type="text"
                                      value={business.address.town}
                                      onChange={(e) => handleBusinessAddressChange(index, "town", e.target.value)}
                                      className={inputClass(false)}
                                      placeholder="Town / city"
                                    />
                                  </FormField>
                                  <FormField label="PIN code">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={business.address.pincode}
                                      onChange={(e) => handleBusinessAddressChange(index, "pincode", e.target.value)}
                                      className={inputClass(false, "font-mono tabular-nums")}
                                      placeholder="6 digits"
                                      maxLength={6}
                                    />
                                  </FormField>
                                  <FormField label="Address line 1">
                                    <input
                                      type="text"
                                      value={business.address.address_line_1}
                                      onChange={(e) => handleBusinessAddressChange(index, "address_line_1", e.target.value)}
                                      className={inputClass(false)}
                                      placeholder="Building, street"
                                    />
                                  </FormField>
                                  <FormField label="Address line 2">
                                    <input
                                      type="text"
                                      value={business.address.address_line_2}
                                      onChange={(e) => handleBusinessAddressChange(index, "address_line_2", e.target.value)}
                                      className={inputClass(false)}
                                      placeholder="Area, landmark"
                                    />
                                  </FormField>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </FormSection>
                  );
                })}

                <button
                  type="button"
                  onClick={addBusiness}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700"
                >
                  <FiPlus className="h-4 w-4" />
                  Add another business
                </button>

                <FormSection
                  title="Groups"
                  description="Add the primary business to client groups (optional)"
                  icon={FiUsers}
                  tone="emerald"
                  actions={
                    groupsList.length > 0 ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={selectAllGroups}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllGroups}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null
                  }
                >
                  {groupsList.length === 0 ? (
                    <p className="text-sm text-slate-500">No groups in this branch yet. You can create them under Office Assistance → Groups.</p>
                  ) : (
                    <div className="space-y-3">
                      {groupsList.length > 8 && (
                        <div className="relative max-w-sm">
                          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={searchGroup}
                            onChange={(e) => setSearchGroup(e.target.value)}
                            className={inputClass(false, "pl-9 py-2")}
                            placeholder="Search groups…"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {filteredGroups.map((group) => {
                          const on = firstBusiness?.groups?.includes(group.group_id);
                          return (
                            <button
                              key={group.group_id}
                              type="button"
                              onClick={() => toggleGroup(group.group_id)}
                              aria-pressed={on}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                on
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                              }`}
                            >
                              {on ? <FiCheck className="h-3 w-3" /> : <FiPlus className="h-3 w-3 text-slate-400" />}
                              {group.name}
                            </button>
                          );
                        })}
                        {filteredGroups.length === 0 && <p className="text-sm text-slate-400">No groups match “{searchGroup}”.</p>}
                      </div>
                      <p className="text-xs text-slate-500">{firstBusiness?.groups?.length || 0} selected</p>
                    </div>
                  )}
                </FormSection>
              </div>
            )}

            {/* ---------------- Step 4: opening balance + review ---------------- */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <FormSection title="Opening balance" icon={FiCalendar} tone="amber">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="Amount (₹)" required error={errors.opening_amount} hint="Enter 0 if nothing is due">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={formData.opening_balance.amount}
                          onChange={(e) => handleOpeningBalanceChange("amount", e.target.value)}
                          className={inputClass(Boolean(errors.opening_amount), "pl-8 font-mono tabular-nums")}
                          placeholder="0.00"
                        />
                      </div>
                    </FormField>
                    <FormField
                      label="Type"
                      required
                      hint={formData.opening_balance.type === "debit" ? "Client owes you (receivable)" : "You owe the client (advance)"}
                    >
                      <SegmentedControl
                        className="flex w-full [&>button]:flex-1 [&>button]:justify-center [&>button]:py-2"
                        value={formData.opening_balance.type}
                        onChange={(v) => handleOpeningBalanceChange("type", v)}
                        options={[
                          { value: "debit", label: "Debit" },
                          { value: "credit", label: "Credit" },
                        ]}
                      />
                    </FormField>
                    <FormField label="As on date" required error={errors.opening_date}>
                      <DatePickerField
                        value={formData.opening_balance.date || ""}
                        onChange={(val) => handleOpeningBalanceChange("date", typeof val === "string" ? val : "")}
                        placeholder="DD/MM/YYYY"
                        mode="single"
                        hideTabs
                        showResetButton={false}
                        maxSelectableDate={new Date().toISOString().split("T")[0]}
                        wrapperClassName="w-full block"
                        buttonClassName={inputClass(Boolean(errors.opening_date), DATE_BTN)}
                      />
                    </FormField>
                  </div>
                </FormSection>

                <section className="rounded-xl border border-slate-200 bg-slate-50/60">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h4 className="text-sm font-semibold text-slate-900">Review</h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      Edit details
                    </button>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
                    {[
                      ["Name", formData.full_name],
                      ["PAN", formData.pan, true],
                      ["Mobile", formData.mobile ? `+${formData.country_code} ${formData.mobile}` : "", true],
                      ["Email", formData.email],
                      [
                        "Address",
                        [formData.town_or_village, formData.district, formData.state, formData.pincode].filter(Boolean).join(", "),
                      ],
                      [
                        "Businesses",
                        formData.businesses
                          .map((b) => (b.type === "individual" ? "Individual" : b.firm || "Unnamed firm"))
                          .join(", "),
                      ],
                    ].map(([label, value, mono]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className={`mt-0.5 truncate font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            )}
          </div>
        </WizardBody>

        <WizardFooter
          hint={currentStep < STEPS.length ? `Next: ${STEPS[currentStep].title}` : "The client is created as soon as you confirm."}
        >
          {currentStep > 1 ? (
            <button type="button" onClick={prevStep} className="ui-btn ui-btn-secondary">
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost">
              Cancel
            </button>
          )}
          {currentStep < STEPS.length ? (
            <button type="button" onClick={nextStep} className="ui-btn ui-btn-primary min-w-[112px]">
              Continue
              <FiArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" disabled={loading || uploading} className="ui-btn ui-btn-primary min-w-[140px]">
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating…
                </>
              ) : (
                <>
                  <FiCheck className="h-4 w-4" />
                  Create client
                </>
              )}
            </button>
          )}
        </WizardFooter>
      </form>

      {/* Existing client with the same PAN */}
      {showExistingPanModal && panDuplicateClient && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowExistingPanModal(false)} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="existing-pan-modal-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop"
          >
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <FiUser className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="existing-pan-modal-title" className="text-sm font-semibold text-slate-900">
                  This PAN is already a client
                </h3>
                <p className="text-xs text-slate-500">Open their profile instead of creating a duplicate.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExistingPanModal(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {panDuplicateClient.image ? (
                    <img src={panDuplicateClient.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FiUser className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{panDuplicateClient.name || "—"}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[panDuplicateClient.care_of, panDuplicateClient.guardian_name].filter(Boolean).join(" ") || "—"}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                {[
                  ["PAN", formData.pan, true],
                  ["Username", panDuplicateClient.username],
                  ["Mobile", panDuplicateClient.mobile, true],
                  ["Email", panDuplicateClient.email],
                ].map(([label, value, mono]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className={`mt-0.5 break-all font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button type="button" onClick={() => setShowExistingPanModal(false)} className="ui-btn ui-btn-secondary flex-1">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const username = panDuplicateClient.username;
                  setShowExistingPanModal(false);
                  if (username) {
                    onClose?.();
                    navigate(`/client/profile/${username}`);
                  }
                }}
                className="ui-btn ui-btn-primary flex-1"
              >
                View profile
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Created */}
      {showCreateSuccessModal && clientCreateSuccess && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop"
          >
            <div className="flex flex-col items-center px-6 pb-4 pt-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
                <FiCheck className="h-6 w-6" strokeWidth={3} />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">Client created</h3>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-800">{clientCreateSuccess.name || "The client"}</span> has been added to your branch.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-5">
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-sm">
                {[
                  ["Username", clientCreateSuccess.username, true],
                  ["Profile ID", clientCreateSuccess.profile_id, true],
                  ["Mobile", clientCreateSuccess.mobile, true],
                  ["PAN", clientCreateSuccess.pan_number, true],
                  ["Email", clientCreateSuccess.email],
                  ["Branch", clientCreateSuccess.branch_id, true],
                ].map(([label, value, mono]) => (
                  <div key={label} className="min-w-0 bg-white px-3 py-2.5">
                    <dt className="text-[11px] text-slate-500">{label}</dt>
                    <dd className={`mt-0.5 break-all font-medium text-slate-900 ${mono ? "font-mono text-[13px]" : ""}`}>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              {Array.isArray(clientCreateSuccess.firms) && clientCreateSuccess.firms.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    Firms ({clientCreateSuccess.firms.length})
                  </p>
                  <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                    {clientCreateSuccess.firms.map((firm) => (
                      <li key={firm.firm_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="min-w-0 truncate text-sm font-medium text-slate-900">{firm.firm_name || "Individual"}</span>
                        <span className="shrink-0 font-mono text-[11px] text-slate-500">{firm.firm_id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  closeCreateSuccessModal();
                  onClose?.();
                }}
                className="ui-btn ui-btn-ghost"
              >
                Done
              </button>
              <button type="button" onClick={closeCreateSuccessModal} className="ui-btn ui-btn-secondary">
                <FiPlus className="h-4 w-4" />
                Add another
              </button>
              <button type="button" onClick={handleViewCreatedClient} className="ui-btn ui-btn-primary">
                Open profile
                <FiArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function NoAccess({ onClose }) {
  return (
    <>
      <WizardHeader id="client-create-modal-title" icon={<FiUserPlus className="h-5 w-5" />} title="New client" onClose={onClose} />
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FiLock className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">You can't create clients</h3>
          <p className="mt-1 text-xs text-slate-500">Ask your branch admin for the “Create client” permission.</p>
        </div>
      </div>
    </>
  );
}

/**
 * Global client-create modal. Open it with `useClientCreate().openClientCreate()`.
 */
export default function ClientCreateModal({ isOpen, onClose, onCreated }) {
  const { check } = useUserPermissions();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  useEffect(() => {
    if (isOpen) setInstance((i) => i + 1);
  }, [isOpen]);

  return (
    <>
      <WizardModal isOpen={isOpen} onClose={onClose} labelledBy="client-create-modal-title" maxWidth="sm:max-w-4xl">
        {check("client_create") ? (
          <ClientCreateForm
            key={instance}
            onClose={onClose}
            onCreated={onCreated}
            onOpenBulk={() => {
              onClose?.();
              setBulkOpen(true);
            }}
          />
        ) : (
          <NoAccess onClose={onClose} />
        )}
      </WizardModal>
      <BulkImportClientsModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </>
  );
}
